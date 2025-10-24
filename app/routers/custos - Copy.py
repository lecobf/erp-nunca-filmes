from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..utils.deps import get_db
from ..models.custo import Custo
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.custo import CustoBase

router = APIRouter(prefix="/custos", tags=["custos"])

@router.get("")
def listar_custos(db: Session = Depends(get_db)):
    custos = (
        db.query(Custo)
        .join(Servico, Custo.servico_id == Servico.id)
        .join(Cliente, Servico.cliente_id == Cliente.id)
        .with_entities(
            Custo.id,
            Custo.descricao,
            Custo.valor,
            Custo.data,
            Servico.descricao.label("servico_descricao"),
            Cliente.nome.label("cliente_nome"),
        )
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

@router.delete("/{custo_id}")
def deletar_custo(custo_id: int, db: Session = Depends(get_db)):
    custo = db.query(Custo).filter(Custo.id == custo_id).first()
    if not custo:
        raise HTTPException(status_code=404, detail="Custo não encontrado")
    db.delete(custo)
    db.commit()
    return {"ok": True}

@router.put("/{custo_id}")
def atualizar_custo(custo_id: int, custo: CustoBase, db: Session = Depends(get_db)):
    db_custo = db.query(Custo).filter(Custo.id == custo_id).first()
    if not db_custo:
        raise HTTPException(status_code=404, detail="Custo não encontrado")

    db_custo.descricao = custo.descricao
    db_custo.valor = custo.valor
    db_custo.data = custo.data
    db.commit()
    db.refresh(db_custo)
    return db_custo

@router.get("/periodo")
def listar_custos_periodo(
    db: Session = Depends(get_db),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None)
):
    query = db.query(Custo)
    if data_inicio and data_fim:
        query = query.filter(Custo.data.between(data_inicio, data_fim))
    elif ano and mes:
        query = query.filter(func.strftime("%Y", Custo.data) == str(ano))
        query = query.filter(func.strftime("%m", Custo.data) == f"{mes:02d}")
    elif ano:
        query = query.filter(func.strftime("%Y", Custo.data) == str(ano))

    custos = query.all()
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
