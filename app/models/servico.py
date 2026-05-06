from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from ..core.db import Base


class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    data_contratacao = Column(Date, nullable=False)
    tipo_servico = Column(String, nullable=False)  # Job ou Aluguel
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    descricao = Column(String, nullable=True)

    valor_diaria_cache = Column(Float, nullable=False, default=0.0)
    valor_diaria_equipamentos = Column(Float, nullable=False, default=0.0)

    valor_total = Column(Float, nullable=False, default=0.0)
    valor_desconto = Column(Float, default=0.0)
    valor_final = Column(Float, nullable=False, default=0.0)

    data_previsao_pagamento = Column(Date, nullable=False)
    status = Column(String, default="pendente")  # pendente, parcial, pago

    valor_pendente_atual = Column(Float, default=0.0)

    is_pacote = Column(Boolean, nullable=False, default=False)

    cliente = relationship("Cliente", back_populates="servicos")
    pagamentos = relationship("Pagamento", back_populates="servico", cascade="all,delete")
    custos = relationship("Custo", back_populates="servico", cascade="all,delete")

    servico_equipamentos = relationship(
        "ServicoEquipamento",
        back_populates="servico",
        cascade="all,delete-orphan",
        lazy="selectin",
    )

    servico_datas_list = relationship(
        "ServicoDatas",
        back_populates="servico",
        cascade="all,delete-orphan",
        lazy="selectin",
        order_by="ServicoDatas.data",
    )

    @property
    def numero_diarias(self) -> int:
        return len(self.servico_datas_list) if self.servico_datas_list is not None else 0

    @property
    def datas(self) -> list:
        if not self.servico_datas_list:
            return []
        return [sd.data for sd in self.servico_datas_list]
