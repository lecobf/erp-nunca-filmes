# app/routers/dashboard.py
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.core.db import get_db
from app.models.servico import Servico
from app.models.pagamento import Pagamento
from app.models.custo import Custo
from app.models.cliente import Cliente

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ============================================================
# 🔹 Função auxiliar para converter datas
# ============================================================
def parse_date(data_str: str, default: date) -> date:
    try:
        return datetime.strptime(data_str, "%Y-%m-%d").date()
    except Exception:
        return default


# ============================================================
# 🔹 Rota principal: /dashboard/periodo
# ============================================================
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

    # ----------------------------------------
    # 🔸 Função de cálculo consolidado
    # ----------------------------------------
    def calc(tipo: str | None = None):
        filtro_tipo = []
        if tipo:
            filtro_tipo.append(Servico.tipo == tipo)

        # 🔸 Receita prevista (serviços criados no período)
        receita_prevista = (
            db.query(func.sum(Servico.valor_final))
            .filter(Servico.data_criacao.between(inicio, fim), *filtro_tipo)
            .scalar()
            or 0
        )

        # 🔸 Receita recebida (pagamentos realizados no período)
        receita_recebida = (
            db.query(func.sum(Pagamento.valor_pago))
            .filter(Pagamento.data_pagamento.between(inicio, fim))
            .scalar()
            or 0
        )

        # 🔸 Receita retroativa
        receita_retroativa = (
            db.query(func.sum(Pagamento.valor_pago))
            .join(Servico, Pagamento.servico_id == Servico.id)
            .filter(
                Servico.data_criacao < inicio,
                Pagamento.data_pagamento.between(inicio, fim),
                *filtro_tipo,
            )
            .scalar()
            or 0
        )

        # 🔸 A receber (serviços no período com saldo)
        a_receber_periodo = (
            db.query(func.sum(Servico.valor_final - Servico.valor_pago_total))
            .filter(Servico.data_criacao.between(inicio, fim), *filtro_tipo)
            .scalar()
            or 0
        )

        # 🔸 A receber retroativo (serviços anteriores ainda com saldo)
        a_receber_retroativo = (
            db.query(func.sum(Servico.valor_final - Servico.valor_pago_total))
            .filter(Servico.data_criacao < inicio, *filtro_tipo)
            .scalar()
            or 0
        )

        # 🔸 Custos no período
        custos = (
            db.query(func.sum(Custo.valor))
            .filter(Custo.data_custo.between(inicio, fim))
            .scalar()
            or 0
        )

        lucro_liquido = receita_recebida - custos

        # 🔸 Receita mensal (PostgreSQL usa to_char)
        mensal = (
            db.query(
                func.to_char(Servico.data_criacao, "Mon/YYYY").label("mes"),
                func.sum(Servico.valor_final).label("valor"),
            )
            .filter(Servico.data_criacao.between(inicio, fim), *filtro_tipo)
            .group_by(text("mes"))
            .order_by(text("min(Servico.data_criacao)"))
            .all()
        )

        mensal_formatado = [
            {"mes": m.mes, "valor": float(m.valor or 0)} for m in mensal
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

    # ----------------------------------------
    # 🔸 Retorno consolidado
    # ----------------------------------------
    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "geral": calc(),
        "job": calc("Job"),
        "aluguel": calc("Aluguel"),
    }


# ============================================================
# 🔹 Rota: /dashboard/top-clientes-pagamentos
# ============================================================
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
        .join(Pagamento, Pagamento.cliente_id == Cliente.id)
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
    outros_total = sum([r["total_pago"] for r in resultados[5:]])
    if outros_total > 0:
        top5.append(
            {"cliente_id": None, "cliente_nome": "Outros", "total_pago": float(outros_total)}
        )

    return top5
