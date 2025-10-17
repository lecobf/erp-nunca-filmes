# app/routers/dashboard.py
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.pagamento import Pagamento
from ..models.custo import Custo

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
