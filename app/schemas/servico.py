import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

# ---- Itens de equipamento no serviço ----
class ServicoEquipamentoIn(BaseModel):
    equipamento_id: int
    quantidade: int = Field(default=1, ge=1)

class ServicoEquipamentoOut(BaseModel):
    id: int
    equipamento_id: int
    quantidade: int
    valor_unit_diaria: float
    subtotal_diaria: float

    class Config:
        from_attributes = True

# ---- Entrada para criar/atualizar serviço ----
class ServicoCreate(BaseModel):
    data_contratacao: datetime.date
    tipo_servico: str  # "Job" ou "Aluguel"
    cliente_id: int
    descricao: Optional[str] = None

    numero_diarias: int = Field(default=1, ge=1)
    valor_diaria_cache: float = 0.0            # será forçado a 0 no Aluguel
    valor_diaria_equipamentos: float = 0.0     # opcional no Job; obrigatório no Aluguel (se não vier equipamentos)

    valor_desconto: float = 0.0

    data_previsao_pagamento: Optional[datetime.date] = None
    status: str = "pendente"    
    is_pacote: bool = False

    # lista opcional de equipamentos; se presente, sobrepõe o valor_diaria_equipamentos somando os subtotais
    equipamentos: Optional[List[ServicoEquipamentoIn]] = None

class ServicoOut(BaseModel):
    id: int
    data_contratacao: datetime.date
    tipo_servico: str
    cliente_id: int
    descricao: Optional[str]
    numero_diarias: int
    valor_diaria_cache: float
    valor_diaria_equipamentos: float
    valor_total: float
    valor_desconto: float
    valor_final: float
    data_previsao_pagamento: datetime.date
    status: str
    valor_pendente_atual: float
    is_pacote: bool

    # opcional: retornar os itens vinculados
    servico_equipamentos: List[ServicoEquipamentoOut] = []

    class Config:
        from_attributes = True
