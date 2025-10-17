# app/routers/dashboard.py
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.pagamento import Pagamento
from ..models.custo import Custo
from ..models.cliente import Cliente

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/periodo")
def dashboard_periodo(
    db: Session = Depends(get_db),
    data_inicio: Optional[datetime.date] = Query(None),
    data_fim: Optional[datetime.date] = Query(None),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None)
):
    """
    Retorna indicadores financeiros considerando filtros por:
    - Período (data_inicio e data_fim)
    - Ano e mês (inteiros)
    - Apenas ano (automático: 01/01 a 31/12)
    """

    # =============================
    # 🔹 Determina intervalo de referência
    # =============================
    if data_inicio and data_fim:
        inicio = data_inicio
        fim = data_fim
    elif ano and mes:
        inicio = datetime.date(ano, mes, 1)
        if mes == 12:
            fim = datetime.date(ano, 12, 31)
        else:
            fim = datetime.date(ano, mes + 1, 1) - datetime.timedelta(days=1)
    elif ano:
        inicio = datetime.date(ano, 1, 1)
        fim = datetime.date(ano, 12, 31)
    else:
        primeiro = db.query(func.min(Servico.data_contratacao)).scalar()
        ultimo = db.query(func.max(Servico.data_contratacao)).scalar()
        inicio = primeiro or datetime.date.today().replace(month=1, day=1)
        fim = ultimo or datetime.date.today()

    # =============================
    # 🔹 Função de cálculo genérica
    # =============================
    def calc(tipo: Optional[str] = None):
        query_serv = db.query(Servico)
        if tipo:
            query_serv = query_serv.filter(Servico.tipo_servico == tipo)

        # 🔹 Serviços do período
        servicos_periodo = (
            query_serv.filter(
                func.date(Servico.data_contratacao).between(
                    inicio.strftime("%Y-%m-%d"), fim.strftime("%Y-%m-%d")
                )
            ).all()
        )

        # 🔹 Serviços anteriores ao período
        servicos_anteriores = (
            query_serv.filter(
                func.date(Servico.data_contratacao) < inicio.strftime("%Y-%m-%d")
            ).all()
        )

        ids_periodo = [s.id for s in servicos_periodo]
        ids_anteriores = [s.id for s in servicos_anteriores]

        # 🔹 Pagamentos realizados dentro do período
        pagamentos_periodo = (
            db.query(Pagamento)
            .filter(
                func.date(Pagamento.data_pagamento).between(
                    inicio.strftime("%Y-%m-%d"), fim.strftime("%Y-%m-%d")
                )
            )
            .all()
        )

        # 🔹 Custos associados a serviços do período
        custos_periodo = db.query(Custo).filter(Custo.servico_id.in_(ids_periodo)).all()

        # =============================
        # 🔸 Cálculos principais
        # =============================

        # Soma do valor_final dos serviços contratados dentro do período
        receita_prevista_periodo = sum(s.valor_final or 0 for s in servicos_periodo)

        # Pagamentos de serviços contratados dentro do período
        receita_recebida_periodo = sum(
            p.valor_pago or 0
            for p in pagamentos_periodo
            if p.servico_id in ids_periodo
        )

        # Pagamentos realizados no período, mas de serviços contratados antes
        receita_retroativa = sum(
            p.valor_pago or 0
            for p in pagamentos_periodo
            if p.servico_id in ids_anteriores
        )

        # Valores pendentes de serviços contratados dentro do período
        a_receber_periodo = sum(s.valor_pendente_atual or 0 for s in servicos_periodo)

        # Valores pendentes de serviços anteriores ao período
        a_receber_retroativo = sum(s.valor_pendente_atual or 0 for s in servicos_anteriores)

        # Custos do período
        custos_total = sum(c.valor or 0 for c in custos_periodo)

        # Lucro líquido = (Receita Recebida no Período + Retroativa) - Custos
        lucro_liquido = (receita_recebida_periodo + receita_retroativa) - custos_total

        # =============================
        # 🔸 Evolução mensal (para gráficos)
        # =============================
        mensal_map = {}
        for s in servicos_periodo:
            if s.data_contratacao:
                chave = s.data_contratacao.strftime("%b/%Y")
                mensal_map[chave] = mensal_map.get(chave, 0) + (s.valor_final or 0)

        mensal = [
            {"mes": chave, "valor": valor}
            for chave, valor in sorted(
                mensal_map.items(),
                key=lambda x: datetime.datetime.strptime(x[0], "%b/%Y")
            )
        ]

        return {
            "receita_prevista_periodo": receita_prevista_periodo,
            "receita_recebida_periodo": receita_recebida_periodo,
            "receita_retroativa": receita_retroativa,
            "a_receber_periodo": a_receber_periodo,
            "a_receber_retroativo": a_receber_retroativo,
            "lucro_liquido": lucro_liquido,
            "mensal": mensal,
        }

    # =============================
    # 🔹 Retorno completo
    # =============================
    return {
        "periodo": {"inicio": inicio, "fim": fim},
        "geral": calc(),
        "job": calc("Job"),
        "aluguel": calc("Aluguel"),
    }
# ============================================================
# 🧁 Novo endpoint: Top clientes por pagamentos no período
# ============================================================
@router.get("/top-clientes-pagamentos")
def top_clientes_pagamentos(
    ano: int | None = Query(None),
    mes: int | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """
    Retorna os 'limit' clientes que mais pagaram no período,
    somando Pagamento.valor_pago, e agrega o restante em 'Outros'.
    Filtros aceitos: ano/mes OU data_inicio/data_fim (YYYY-MM-DD).
    """

    # Base: soma por cliente (via serviço)
    total_label = func.coalesce(func.sum(Pagamento.valor_pago), 0).label("total_pago")
    q = (
        db.query(Cliente.id.label("cliente_id"), Cliente.nome.label("cliente_nome"), total_label)
        .join(Servico, Servico.cliente_id == Cliente.id)
        .join(Pagamento, Pagamento.servico_id == Servico.id)
    )

    # Filtros de data
    if data_inicio:
        try:
            dt_ini = datetime.strptime(data_inicio, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="data_inicio inválida (YYYY-MM-DD)")
        q = q.filter(Pagamento.data_pagamento >= dt_ini)

    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="data_fim inválida (YYYY-MM-DD)")
        q = q.filter(Pagamento.data_pagamento <= dt_fim)

    if ano:
        # compatível com SQLite
        q = q.filter(func.strftime("%Y", Pagamento.data_pagamento) == str(ano))
    if mes:
        q = q.filter(func.strftime("%m", Pagamento.data_pagamento) == f"{int(mes):02d}")

    # Agrupa e ordena
    q = q.group_by(Cliente.id, Cliente.nome).order_by(total_label.desc())

    rows = q.all()

    # Monta top N + 'Outros'
    top = []
    outros_total = 0.0

    for idx, r in enumerate(rows):
        rec = {
            "cliente_id": r.cliente_id,
            "cliente_nome": r.cliente_nome,
            "total_pago": float(r.total_pago or 0),
        }
        if idx < limit:
            top.append(rec)
        else:
            outros_total += rec["total_pago"]

    if outros_total > 0:
        top.append({
            "cliente_id": None,
            "cliente_nome": "Outros",
            "total_pago": float(outros_total),
        })

    return top