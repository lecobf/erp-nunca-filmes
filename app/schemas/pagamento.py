import datetime
from pydantic import BaseModel

class PagamentoCreate(BaseModel):
    servico_id: int
    valor_pago: float
    data_pagamento: datetime.date

class PagamentoOut(BaseModel):
    id: int
    servico_id: int
    valor_pago: float
    data_pagamento: datetime.date
    valor_pendente: float
    servico_descricao: str
    servico_valor_final: float
    cliente_nome: str
    servico_valor_pendente_atual: float | None = None
    class Config:
        from_attributes = True
