from pydantic import BaseModel
from typing import Optional

class EquipamentoCreate(BaseModel):
    nome: str
    categoria: Optional[str] = None
    valor_aluguel: float
    quantidade: int = 0

class EquipamentoUpdate(BaseModel):
    nome: str
    categoria: Optional[str] = None
    valor_aluguel: float
    quantidade: int

class EquipamentoOut(BaseModel):
    id: int
    nome: str
    categoria: Optional[str] = None
    valor_aluguel: float
    quantidade: int
    class Config:
        from_attributes = True
