from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..utils.deps import get_db
from ..models.equipamento import Equipamento
from ..schemas.equipamento import EquipamentoCreate, EquipamentoUpdate, EquipamentoOut
from pydantic import BaseModel

router = APIRouter(prefix="/equipamentos", tags=["equipamentos"])

@router.get("", response_model=list[EquipamentoOut])
def listar_equipamentos(db: Session = Depends(get_db)):
    return db.query(Equipamento).all()

@router.post("", response_model=EquipamentoOut)
def criar_equipamento(equipamento: EquipamentoCreate, db: Session = Depends(get_db)):
    db_equipamento = Equipamento(**equipamento.dict())
    db.add(db_equipamento)
    db.commit()
    db.refresh(db_equipamento)
    return db_equipamento

@router.delete("/{equipamento_id}")
def deletar_equipamento(equipamento_id: int, db: Session = Depends(get_db)):
    equipamento = db.query(Equipamento).filter(Equipamento.id == equipamento_id).first()
    if not equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    db.delete(equipamento)
    db.commit()
    return {"ok": True}

@router.put("/{equipamento_id}", response_model=EquipamentoOut)
def atualizar_equipamento(equipamento_id: int, equipamento: EquipamentoUpdate, db: Session = Depends(get_db)):
    db_equipamento = db.query(Equipamento).filter(Equipamento.id == equipamento_id).first()
    if not db_equipamento:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")

    for k, v in equipamento.dict().items():
        setattr(db_equipamento, k, v)

    db.commit()
    db.refresh(db_equipamento)
    return db_equipamento

# --- Importação em massa ---
class EquipamentoImport(BaseModel):
    nome: str
    categoria: Optional[str] = None
    valor_aluguel: float | None = None
    quantidade: int | None = 0


@router.post("/importar")
def importar_equipamentos(dados: List[EquipamentoImport], db: Session = Depends(get_db)):
    novos = []
    for item in dados:
        eq = Equipamento(
            nome=item.nome,
            categoria=item.categoria,
            valor_aluguel=item.valor_aluguel or 0.0,
            quantidade=item.quantidade or 0,
        )
        db.add(eq)
        novos.append(eq)

    db.commit()
    return {"msg": f"{len(novos)} equipamentos importados com sucesso"}
