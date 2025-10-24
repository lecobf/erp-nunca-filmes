from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.db import get_db
from app.models.servico import Servico
from app.models.pagamento import Pagamento
from app.models.custo import Custo
from app.models.cliente import Cliente

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# -----------------------------
# Função auxiliar para parsear datas
# -----------------------------
def parse_date(data_str: str | None, default: date) -> date:
    if not data_str:
        return default
    try:
        return datetime.strptime(data_str, "%Y-%m-%d").date()
    except Exception:
        return default


# -----------------------------
# Endpoint: /dashboard/periodo
# -----------------------------
@router.get("/periodo")
def dashboard_periodo(
    ano: int = Query(None, description="Ano de referência (ex: 2025)"),
    data_inicio: str = Query(None, description="Data inicial (YYYY-MM-DD)"),
    data_fim: str = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    hoje = date.today()
    ano = ano or hoje.year
    inicio = parse_date(data_inicio, date(ano, 1, 1))
    fim = parse_date(data_fim, date(ano, 12, 31))

    def calc(tipo: str | None = None):
        filtros_servico = [Servico.data_contratacao.between(inicio, fim)]
        if tipo:
            filtros_servico.append(Servico.tipo_servico == tipo)

        # Receita prevista (serviços criados no período)
        receita_prevista = (
            db.query(func.coalesce(func.sum(Servico.valor_final), 0.0))
            .filter(*filtros_servico)
            .scalar()
        )

        # Receita recebida (pagamentos efetivados no período)
        receita_recebida = (
            db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0.0))
            .filter(Pagamento.data_pagamento.between(inicio, fim))
            .scalar()
        )

        # Receita retroativa (pagamentos de serviços criados antes do período)
        receita_retroativa = (
            db.query(func.coalesce(func.sum(Pagamento.valor_pago), 0.0))
            .join(Servico, Pagamento.servico_id == Servico.id)
            .filter(
                Servico.data_contratacao < inicio,
                Pagamento.data_pagamento.between(inicio, fim),
                *( [Servico.tipo_servico == tipo] if tipo else [] ),
            )
            .scalar()
        )

        # A receber no período
        a_receber_periodo = (
            db.query(func.coalesce(func.sum(Servico.valor_pendente_atual), 0.0))
            .filter(*filtros_servico)
            .scalar()
        )

        # A receber retroativo
        filtros_retro = []
        if tipo:
            filtros_retro.append(Servico.tipo_servico == tipo)

        a_receber_retroativo = (
            db.query(func.coalesce(func.sum(Servico.valor_pendente_atual), 0.0))
            .filter(Servico.data_contratacao < inicio, *filtros_retro)
            .scalar()
        )

        # Custos do período
        custos = (
            db.query(func.coalesce(func.sum(Custo.valor), 0.0))
            .filter(Custo.data.between(inicio, fim))
            .scalar()
        )

        lucro_liquido = receita_recebida - custos

        # Agregação mensal (prevista)
        mes_trunc = func.date_trunc("month", Servico.data_contratacao).label("mes_ref")
        mensal_prevista = (
            db.query(
                mes_trunc,
                func.coalesce(func.sum(Servico.valor_final), 0.0).label("valor_previsto"),
            )
            .filter(*filtros_servico)
            .group_by(mes_trunc)
            .order_by(mes_trunc.asc())
            .all()
        )

        # Agregação mensal (recebida)
        mes_pag = func.date_trunc("month", Pagamento.data_pagamento).label("mes_ref")
        if tipo:
            mensal_recebida = (
                db.query(
                    mes_pag,
                    func.coalesce(func.sum(Pagamento.valor_pago), 0.0).label("valor_recebido"),
                )
                .join(Servico, Pagamento.servico_id == Servico.id)
                .filter(
                    Pagamento.data_pagamento.between(inicio, fim),
                    Servico.tipo_servico == tipo,
                )
                .group_by(mes_pag)
                .order_by(mes_pag.asc())
                .all()
            )
        else:
            mensal_recebida = (
                db.query(
                    mes_pag,
                    func.coalesce(func.sum(Pagamento.valor_pago), 0.0).label("valor_recebido"),
                )
                .filter(Pagamento.data_pagamento.between(inicio, fim))
                .group_by(mes_pag)
                .order_by(mes_pag.asc())
                .all()
            )

        # Junta prevista e recebida
        mapa_prev = {row.mes_ref: float(row.valor_previsto) for row in mensal_prevista}
        mapa_rec = {row.mes_ref: float(row.valor_recebido) for row in mensal_recebida}
        chaves = sorted(set(mapa_prev) | set(mapa_rec))
        mensal_formatado = [
            {
                "mes": dt.strftime("%Y-%m"),
                "valor": mapa_prev.get(dt, 0.0),
                "receita_recebida": mapa_rec.get(dt, 0.0),
            }
            for dt in chaves
        ]

        return {
            "receita_prevista_periodo": float(receita_prevista),
            "receita_recebida_periodo": float(receita_recebida),
            "receita_retroativa": float(receita_retroativa),
            "a_receber_periodo": float(a_receber_periodo),
            "a_receber_retroativo": float(a_receber_retroativo),
            "lucro_liquido": float(lucro_liquido),
            "mensal": mensal_formatado,
        }

    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "geral": calc(),
        "job": calc("Job"),
        "aluguel": calc("Aluguel"),
    }


# -----------------------------
# Endpoint: /dashboard/top-clientes-pagamentos
# -----------------------------
@router.get("/top-clientes-pagamentos")
def top_clientes_pagamentos(
    ano: int = Query(None, description="Ano de referência"),
    db: Session = Depends(get_db),
):
    ano = ano or datetime.now().year
    inicio = datetime(ano, 1, 1)
    fim = datetime(ano, 12, 31)

    total_label = func.sum(Pagamento.valor_pago).label("total_pago")

    query = (
        db.query(
            Cliente.id.label("cliente_id"),
            Cliente.nome.label("cliente_nome"),
            total_label,
        )
        .join(Servico, Servico.cliente_id == Cliente.id)
        .join(Pagamento, Pagamento.servico_id == Servico.id)
        .filter(Pagamento.data_pagamento.between(inicio, fim))
        .group_by(Cliente.id, Cliente.nome)
        .order_by(total_label.desc())
        .all()
    )

    resultados = [
        {
            "cliente_id": q.cliente_id,
            "cliente_nome": q.cliente_nome,
            "total_pago": float(q.total_pago or 0),
        }
        for q in query
    ]

    top5 = resultados[:5]
    outros_total = sum(r["total_pago"] for r in resultados[5:])
    if outros_total > 0:
        top5.append(
            {"cliente_id": None, "cliente_nome": "Outros", "total_pago": float(outros_total)}
        )

    return top5
