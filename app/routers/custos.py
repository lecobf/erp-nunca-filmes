from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..utils.deps import get_db
from ..utils.filtros import aplicar_filtros_data
from ..models.custo import Custo
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.custo import CustoBase

router = APIRouter(prefix="/custos", tags=["custos"])

@router.get("")
def listar_custos(db: Session = Depends(get_db)):
    custos = (
        db.query(
            Custo.id,
            Custo.servico_id,
            Custo.descricao,
            Custo.valor,
            Custo.data,
            Servico.descricao.label("servico_descricao"),
            Cliente.nome.label("cliente_nome"),
        )
        .join(Servico, Custo.servico_id == Servico.id)
        .join(Cliente, Servico.cliente_id == Cliente.id)
        .order_by(Custo.data.desc())
        .all()
    )
    return [c._asdict() for c in custos]

@router.post("")
def criar_custo(custo: CustoBase, db: Session = Depends(get_db)):
    servico = db.query(Servico).filter(Servico.id == custo.servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db_custo = Custo(**custo.dict())
    db.add(db_custo)
    db.commit()
    db.refresh(db_custo)
    return db_custo

@router.put("/{custo_id}")
def atualizar_custo(custo_id: int, custo: CustoBase, db: Session = Depends(get_db)):
    db_custo = db.query(Custo).filter(Custo.id == custo_id).first()
    if not db_custo:
        raise HTTPException(status_code=404, detail="Custo não encontrado")
    servico = db.query(Servico).filter(Servico.id == custo.servico_id).first()
    if not servico:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db_custo.servico_id = custo.servico_id
    db_custo.descricao = custo.descricao
    db_custo.valor = custo.valor
    db_custo.data = custo.data
    db.commit()
    db.refresh(db_custo)
    return db_custo

@router.delete("/{custo_id}")
def deletar_custo(custo_id: int, db: Session = Depends(get_db)):
    db_custo = db.query(Custo).filter(Custo.id == custo_id).first()
    if not db_custo:
        raise HTTPException(status_code=404, detail="Custo não encontrado")
    db.delete(db_custo)
    db.commit()
    return {"ok": True}

@router.get("/periodo")
def listar_custos_periodo(
    db: Session = Depends(get_db),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    query = db.query(Custo)
    query = aplicar_filtros_data(query, Custo.data, ano, mes, data_inicio, data_fim)
    custos = query.order_by(Custo.data.desc()).all()
    resposta = []
    for c in custos:
        servico = db.query(Servico).filter(Servico.id == c.servico_id).first()
        resposta.append({
            "id": c.id,
            "servico_id": c.servico_id,
            "servico_descricao": servico.descricao if servico else None,
            "descricao": c.descricao,
            "valor": c.valor,
            "data": c.data
        })
    return resposta
