from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from ..core.db import Base


class ServicoDatas(Base):
    __tablename__ = "servico_datas"

    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id", ondelete="CASCADE"), nullable=False)
    data = Column(Date, nullable=False)

    servico = relationship("Servico", back_populates="servico_datas_list")
