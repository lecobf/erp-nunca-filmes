from sqlalchemy import Column, Integer, Float, Date, ForeignKey, String
from sqlalchemy.orm import relationship
import datetime
from ..core.db import Base

class Custo(Base):
    __tablename__ = "custos"
    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    data = Column(Date, default=datetime.date.today)

    servico = relationship("Servico", back_populates="custos")
