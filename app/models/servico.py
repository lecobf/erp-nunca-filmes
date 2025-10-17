#from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Boolean
# ou, se preferir tipos separados:
# from sqlalchemy.types import Boolean

from sqlalchemy.orm import relationship
from ..core.db import Base

class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    data_contratacao = Column(Date, nullable=False)
    tipo_servico = Column(String, nullable=False)  # Job ou Aluguel
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    descricao = Column(String, nullable=True)

    # -------- Nova estrutura de precificação --------
    numero_diarias = Column(Integer, nullable=False, default=1)
    valor_diaria_cache = Column(Float, nullable=False, default=0.0)
    valor_diaria_equipamentos = Column(Float, nullable=False, default=0.0)

    # Derivados/armazenados
    valor_total = Column(Float, nullable=False, default=0.0)
    valor_desconto = Column(Float, default=0.0)
    valor_final = Column(Float, nullable=False, default=0.0)

    data_previsao_pagamento = Column(Date, nullable=False)
    status = Column(String, default="pendente")  # pendente, parcial, pago

    # Saldo consolidado do serviço (manter)
    valor_pendente_atual = Column(Float, default=0.0)

    cliente = relationship("Cliente", back_populates="servicos")
    pagamentos = relationship("Pagamento", back_populates="servico", cascade="all,delete")
    custos = relationship("Custo", back_populates="servico", cascade="all,delete")
    
    is_pacote = Column(Boolean, nullable=False, default=False)

    # Nova relação
    servico_equipamentos = relationship(
        "ServicoEquipamento",
        back_populates="servico",
        cascade="all,delete-orphan",
        lazy="selectin",
    )
