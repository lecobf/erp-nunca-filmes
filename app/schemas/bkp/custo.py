import datetime
from pydantic import BaseModel

class CustoBase(BaseModel):
    servico_id: int
    descricao: str
    valor: float
    data: datetime.date
    class Config:
        from_attributes = True
