from sqlalchemy import Column, Integer, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from ..core.db import Base

class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"))
    valor_pago = Column(Float, nullable=False)
    data_pagamento = Column(Date, default=date.today)
    valor_pendente = Column(Float, default=0)  # histórico no momento do pagamento

    servico = relationship("Servico", back_populates="pagamentos")
