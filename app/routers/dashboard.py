from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.pagamento import Pagamento
from ..models.cliente import Cliente
from ..models.custo import Custo
from ..utils.filtros import aplicar_filtros_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/periodo")
def dados_periodo(
    db: Session = Depends(get_db),
    ano: int | None = Query(None),
    mes: int | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
):
    query_serv = aplicar_filtros_data(db.query(Servico), Servico.data_contratacao, ano, mes, data_inicio, data_fim)
    query_pag = aplicar_filtros_data(db.query(Pagamento), Pagamento.data_pagamento, ano, mes, data_inicio, data_fim)
    query_custo = aplicar_filtros_data(db.query(Custo), Custo.data, ano, mes, data_inicio, data_fim)

    total_servicos = query_serv.count()
    soma_servicos = query_serv.with_entities(func.sum(Servico.valor_final)).scalar() or 0
    soma_pagamentos = query_pag.with_entities(func.sum(Pagamento.valor_pago)).scalar() or 0
    soma_custos = query_custo.with_entities(func.sum(Custo.valor)).scalar() or 0

    lucro_liquido = soma_servicos - soma_custos

    return {
        "total_servicos": total_servicos,
        "soma_servicos": soma_servicos,
        "soma_pagamentos": soma_pagamentos,
        "soma_custos": soma_custos,
        "lucro_liquido": lucro_liquido,
    }

@router.get("/top-clientes-pagamentos")
def top_clientes_pagamentos(db: Session = Depends(get_db), ano: int | None = Query(None)):
    query = (
        db.query(
            Cliente.nome.label("cliente"),
            func.sum(Pagamento.valor_pago).label("total_pago"),
        )
        .join(Servico, Servico.id == Pagamento.servico_id)
        .join(Cliente, Cliente.id == Servico.cliente_id)
    )

    query = aplicar_filtros_data(query, Pagamento.data_pagamento, ano)
    query = query.group_by(Cliente.nome).order_by(func.sum(Pagamento.valor_pago).desc()).limit(10)

    resultados = query.all()
    return [{"cliente": r.cliente, "total_pago": float(r.total_pago or 0)} for r in resultados]
