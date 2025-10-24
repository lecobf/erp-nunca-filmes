from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime
from ..utils.deps import get_db
from ..models.pagamento import Pagamento
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.pagamento import PagamentoBase
from ..utils.filtros import aplicar_filtros_data

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])

@router.get("")
def listar_pagamentos(
    db: Session = Depends(get_db),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    query = (
        db.query(
            Pagamento.id,
            Pagamento.valor_pago,
            Pagamento.data_pagamento,
            Servico.descricao.label("servico"),
            Cliente.nome.label("cliente"),
        )
        .join(Servico, Servico.id == Pagamento.servico_id)
        .join(Cliente, Cliente.id == Servico.cliente_id)
    )

    query = aplicar_filtros_data(query, Pagamento.data_pagamento, ano, mes, data_inicio, data_fim)
    pagamentos = query.order_by(Pagamento.data_pagamento.desc()).all()

    return [p._asdict() for p in pagamentos]
