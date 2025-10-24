from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..utils.deps import get_db
from ..models.pagamento import Pagamento
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.pagamento import PagamentoCreate, PagamentoOut

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])


# 🔹 LISTAR PAGAMENTOS (com múltiplos filtros combinados)
@router.get("")
def listar_pagamentos(
    servico_id: int | None = Query(None),
    cliente_id: int | None = Query(None),  # ✅ Novo filtro por cliente
    ano: int | None = Query(None),
    mes: int | None = Query(None),
    data_inicio: str | None = Query(None),
    data_fim: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Pagamento)

    # 🔸 Filtros de serviço e cliente
    if servico_id:
        query = query.filter(Pagamento.servico_id == servico_id)
    if cliente_id:
        # Faz o join com Servico para filtrar pelo cliente
        query = query.join(Servico, Servico.id == Pagamento.servico_id)
        query = query.filter(Servico.cliente_id == cliente_id)

    # 🔸 Filtros de data
    if ano:
        query = query.filter(func.strftime("%Y", Pagamento.data_pagamento) == str(ano))
    if mes:
        query = query.filter(func.strftime("%m", Pagamento.data_pagamento) == f"{int(mes):02d}")
    if data_inicio:
        try:
            dt_ini = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            query = query.filter(Pagamento.data_pagamento >= dt_ini)
        except ValueError:
            raise HTTPException(status_code=400, detail="Data inicial inválida")
    if data_fim:
        try:
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
            query = query.filter(Pagamento.data_pagamento <= dt_fim)
        except ValueError:
            raise HTTPException(status_code=400, detail="Data final inválida")

    pagamentos = query.order_by(Pagamento.data_pagamento.desc()).all()

    resposta = []
    for p in pagamentos:
        servico = db.query(Servico).filter(Servico.id == p.servico_id).first()
        cliente = (
            db.query(Cliente).filter(Cliente.id == servico.cliente_id).first()
            if servico
            else None
        )
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

    soma_anteriores = (
        db.query(func.sum(Pagamento.valor_pago))
        .filter(Pagamento.servico_id == servico.id)
        .scalar()
        or 0
    )

    valor_pendente = servico.valor_final - (soma_anteriores + pagamento.valor_pago)
    valor_pendente = max(valor_pendente, 0)

    # 🔹 Novo pagamento
    novo_pagamento = Pagamento(
        servico_id=pagamento.servico_id,
        valor_pago=pagamento.valor_pago,
        data_pagamento=pagamento.data_pagamento,
        valor_pendente=valor_pendente,
    )
    db.add(novo_pagamento)

    # 🔹 Atualiza valor_pendente_atual do serviço
    servico.valor_pendente_atual = valor_pendente

    # 🔹 Atualiza status
    soma_total = soma_anteriores + pagamento.valor_pago
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
        "servico_id": novo_pagamento.servico_id,
        "valor_pago": novo_pagamento.valor_pago,
        "data_pagamento": novo_pagamento.data_pagamento,
        "valor_pendente": novo_pagamento.valor_pendente,
        "servico_descricao": servico.descricao,
        "servico_valor_final": servico.valor_final,
        "servico_valor_pendente_atual": servico.valor_pendente_atual,
        "cliente_nome": cliente.nome if cliente else None,
    }


# 🔹 ATUALIZAR PAGAMENTO
@router.put("/{pagamento_id}")
def atualizar_pagamento(
    pagamento_id: int, dados: PagamentoCreate, db: Session = Depends(get_db)
):
    pagamento = db.query(Pagamento).filter(Pagamento.id == pagamento_id).first()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    servico = db.query(Servico).filter(Servico.id == pagamento.servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    pagamento.valor_pago = dados.valor_pago
    pagamento.data_pagamento = dados.data_pagamento
    db.commit()

    soma_pagamentos = (
        db.query(func.sum(Pagamento.valor_pago))
        .filter(Pagamento.servico_id == servico.id)
        .scalar()
        or 0
    )

    valor_pendente_atual = max(servico.valor_final - soma_pagamentos, 0)
    servico.valor_pendente_atual = valor_pendente_atual

    # 🔹 Atualiza valor pendente histórico do pagamento editado
    pagamento.valor_pendente = valor_pendente_atual

    servico.status = (
        "pago" if soma_pagamentos >= servico.valor_final
        else "parcial" if soma_pagamentos > 0
        else "pendente"
    )

    db.commit()
    db.refresh(servico)
    db.refresh(pagamento)

    return {
        "message": "Pagamento atualizado com sucesso",
        "valor_pendente_atual": valor_pendente_atual,
        "servico_status": servico.status,
    }


# 🔹 DELETAR PAGAMENTO
@router.delete("/{pagamento_id}")
def deletar_pagamento(pagamento_id: int, db: Session = Depends(get_db)):
    pagamento = db.query(Pagamento).filter(Pagamento.id == pagamento_id).first()
    if not pagamento:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    servico = db.query(Servico).filter(Servico.id == pagamento.servico_id).first()
    db.delete(pagamento)
    db.commit()

    if servico:
        soma_pagamentos = (
            db.query(func.sum(Pagamento.valor_pago))
            .filter(Pagamento.servico_id == servico.id)
            .scalar()
            or 0
        )
        valor_pendente_atual = max(servico.valor_final - soma_pagamentos, 0)
        servico.valor_pendente_atual = valor_pendente_atual

        servico.status = (
            "pago" if soma_pagamentos >= servico.valor_final
            else "parcial" if soma_pagamentos > 0
            else "pendente"
        )
        db.commit()
        db.refresh(servico)

    return {
        "message": "Pagamento excluído com sucesso",
        "valor_pendente_atual": servico.valor_pendente_atual if servico else None,
        "servico_status": servico.status if servico else None,
    }
