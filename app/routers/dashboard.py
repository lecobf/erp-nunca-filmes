from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.pagamento import Pagamento
from ..models.cliente import Cliente
from ..models.custo import Custo

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ---------------------------------------------
# 📊 TOTAL POR PERÍODO
# ---------------------------------------------
@router.get("/periodo")
def dados_periodo(
    db: Session = Depends(get_db),
    ano: int | None = Query(None),
    mes: int | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
):
    query_serv = db.query(Servico)
    query_pag = db.query(Pagamento)
    query_custos = db.query(Custo)

    # Filtros de data
    if ano:
        query_serv = query_serv.filter(func.extract("year", Servico.data_contratacao) == ano)
        query_pag = query_pag.filter(func.extract("year", Pagamento.data_pagamento) == ano)
        query_custos = query_custos.filter(func.extract("year", Custo.data_custo) == ano)

    if mes:
        query_serv = query_serv.filter(func.extract("month", Servico.data_contratacao) == mes)
        query_pag = query_pag.filter(func.extract("month", Pagamento.data_pagamento) == mes)
        query_custos = query_custos.filter(func.extract("month", Custo.data_custo) == mes)

    if data_inicio and data_fim:
        try:
            dt_ini = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
            query_serv = query_serv.filter(Servico.data_contratacao.between(dt_ini, dt_fim))
            query_pag = query_pag.filter(Pagamento.data_pagamento.between(dt_ini, dt_fim))
            query_custos = query_custos.filter(Custo.data_custo.between(dt_ini, dt_fim))
        except ValueError:
            raise HTTPException(status_code=400, detail="Datas inválidas no formato (YYYY-MM-DD)")

    total_servicos = query_serv.count()
    soma_servicos = query_serv.with_entities(func.sum(Servico.valor_final)).scalar() or 0
    soma_pagamentos = query_pag.with_entities(func.sum(Pagamento.valor_pago)).scalar() or 0
    soma_custos = query_custos.with_entities(func.sum(Custo.valor)).scalar() or 0

    lucro_liquido = soma_servicos - soma_custos

    return {
        "total_servicos": total_servicos,
        "soma_servicos": soma_servicos,
        "soma_pagamentos": soma_pagamentos,
        "soma_custos": soma_custos,
        "lucro_liquido": lucro_liquido,
    }


# ---------------------------------------------
# 🏆 TOP CLIENTES POR PAGAMENTOS
# ---------------------------------------------
@router.get("/top-clientes-pagamentos")
def top_clientes_pagamentos(
    db: Session = Depends(get_db),
    ano: int | None = Query(None)
):
    query = (
        db.query(
            Cliente.nome.label("cliente"),
            func.sum(Pagamento.valor_pago).label("total_pago"),
        )
        .join(Servico, Servico.id == Pagamento.servico_id)
        .join(Cliente, Cliente.id == Servico.cliente_id)
    )

    # ✅ Filtro vem antes do agrupamento e do limit
    if ano:
        query = query.filter(func.extract("year", Pagamento.data_pagamento) == ano)

    query = (
        query.group_by(Cliente.nome)
        .order_by(func.sum(Pagamento.valor_pago).desc())
        .limit(10)
    )

    resultados = query.all()

    return [
        {"cliente": r.cliente, "total_pago": float(r.total_pago or 0.0)}
        for r in resultados
    ]
