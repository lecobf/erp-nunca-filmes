from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..utils.deps import get_db
from ..models.servico import Servico
from ..models.cliente import Cliente
from ..schemas.servico import ServicoCreate
from ..utils.filtros import aplicar_filtros_data

router = APIRouter(prefix="/servicos", tags=["servicos"])

@router.get("")
def listar_servicos(
    db: Session = Depends(get_db),
    ano: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
):
    query = (
        db.query(
            Servico.id,
            Servico.descricao,
            Servico.valor_final,
            Servico.data_contratacao,
            Cliente.nome.label("cliente"),
        )
        .join(Cliente, Cliente.id == Servico.cliente_id)
    )

    query = aplicar_filtros_data(query, Servico.data_contratacao, ano, mes, data_inicio, data_fim)
    servicos = query.order_by(Servico.data_contratacao.desc()).all()

    return [s._asdict() for s in servicos]
