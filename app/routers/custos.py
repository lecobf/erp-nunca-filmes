from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..utils.deps import get_db
from ..models.custo import Custo
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.custo import CustoBase
from ..utils.filtros import aplicar_filtros_data

router = APIRouter(prefix="/custos", tags=["custos"])

@router.get("")
def listar_custos(db: Session = Depends(get_db)):
    custos = (
        db.query(
            Custo.id,
            Custo.descricao,
            Custo.valor,
            Custo.data,
            Servico.descricao.label("servico"),
            Cliente.nome.label("cliente"),
        )
        .join(Servico, Custo.servico_id == Servico.id)
        .join(Cliente, Servico.cliente_id == Cliente.id)
        .all()
    )
    return [c._asdict() for c in custos]

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
    custos = query.all()

    resposta = []
    for c in custos:
        servico = db.query(Servico).filter(Servico.id == c.servico_id).first()
        resposta.append({
            "id": c.id,
            "descricao": c.descricao,
            "valor": c.valor,
            "data": c.data,
            "servico": servico.descricao if servico else None
        })
    return resposta
