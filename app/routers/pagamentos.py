from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
from ..utils.deps import get_db
from ..utils.filtros import aplicar_filtros_data
from ..models.pagamento import Pagamento
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.pagamento import PagamentoCreate, PagamentoOut

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])

# 🔹 LISTAR PAGAMENTOS
@router.get("")
def listar_pagamentos(
    servico_id: Optional[int] = Query(None),
    cliente_id: Optional[int] = Query(None),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Pagamento)
    if servico_id:
        query = query.filter(Pagamento.servico_id == servico_id)
    if cliente_id:
        query = query.join(Servico).filter(Servico.cliente_id == cliente_id)

    query = aplicar_filtros_data(query, Pagamento.data_pagamento, ano, mes, data_inicio, data_fim)
    pagamentos = query.order_by(Pagamento.data_pagamento.desc()).all()

    resposta = []
    for p in pagamentos:
        servico = db.query(Servico).filter(Servico.id == p.servico_id).first()
        cliente = db.query(Cliente).filter(Cliente.id == servico.cliente_id).first() if servico else None
        resposta.append({
            "id": p.id,
            "servico_id": p.servico_id,
            "valor_pago": p.valor_pago,
            "data_pagamento": p.data_pagamento,
            "valor_pendente": p.valor_pendente,
            "servico_descricao": servico.descricao if servico else None,
            "servico_valor_final": servico.valor_final if servico else 0,
            "servico_valor_pendente_atual": servico.valor_pendente_atual if servico else 0,
            "cliente_nome": cliente.nome if cliente else None,
        })
    return resposta

# 🔹 CRIAR PAGAMENTO
@router.post("", response_model=PagamentoOut)
def criar_pagamento(pagamento: PagamentoCreate, db: Session = Depends(get_db)):
    servico = db.query(Servico).filter(Servico.id == pagamento.servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    soma_anteriores = db.query(func.sum(Pagamento.valor_pago)).filter(Pagamento.servico_id == servico.id).scalar() or 0
    valor_pendente = max(servico.valor_final - (soma_anteriores + pagamento.valor_pago), 0)

    novo_pagamento = Pagamento(
        servico_id=pagamento.servico_id,
        valor_pago=pagamento.valor_pago,
        data_pagamento=pagamento.data_pagamento,
        valor_pendente=valor_pendente,
    )
    db.add(novo_pagamento)

    soma_total = soma_anteriores + pagamento.valor_pago
    servico.valor_pendente_atual = valor_pendente
    servico.status = (
        "pago" if soma_total >= servico.valor_final
        else "parcial" if soma_total > 0
        else "pendente"
    )

    db.commit()
    db.refresh(novo_pagamento)
    db.refresh(servico)
    cliente = db.query(Cliente).filter(Cliente.id == servico.cliente_id).first()

    return {
        "id": novo_pagamento.id,
        "servico_id": servico.id,
        "valor_pago": novo_pagamento.valor_pago,
        "data_pagamento": novo_pagamento.data_pagamento,
        "valor_pendente": novo_pagamento.valor_pendente,
        "servico_descricao": servico.descricao,
        "servico_valor_final": servico.valor_final,
        "servico_valor_pendente_atual": servico.valor_pendente_atual,
        "cliente_nome": cliente.nome if cliente else None,
    }
