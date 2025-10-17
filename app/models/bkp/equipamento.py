from sqlalchemy import Column, Integer, String, Float
from ..core.db import Base

class Equipamento(Base):
    __tablename__ = "equipamentos"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    categoria = Column(String, nullable=True)
    valor_aluguel = Column(Float, nullable=False)
    quantidade = Column(Integer, nullable=False, default=0)
