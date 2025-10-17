from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from ..core.db import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    cpf_cnpj = Column(String, nullable=True)

    # ✅ um cliente pode ter vários serviços
    servicos = relationship("Servico", back_populates="cliente")