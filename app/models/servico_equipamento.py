from sqlalchemy import Column, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.db import Base

class ServicoEquipamento(Base):
    __tablename__ = "servico_equipamentos"

    id = Column(Integer, primary_key=True, index=True)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False, index=True)
    equipamento_id = Column(Integer, ForeignKey("equipamentos.id"), nullable=False, index=True)

    # Quantidade de itens daquele equipamento usados por diária
    quantidade = Column(Integer, nullable=False, default=1)

    # Valor unitário copiado do equipamento no momento do vínculo (congela preço do dia)
    valor_unit_diaria = Column(Float, nullable=False, default=0.0)

    # cache: subtotal por diária = quantidade * valor_unit_diaria
    subtotal_diaria = Column(Float, nullable=False, default=0.0)

    servico = relationship("Servico", back_populates="servico_equipamentos")
    equipamento = relationship("Equipamento")

    __table_args__ = (
        # Evita duplicar o mesmo equipamento no mesmo serviço
        UniqueConstraint("servico_id", "equipamento_id", name="uq_servico_equip"),
    )
