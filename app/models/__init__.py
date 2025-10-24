# app/models/__init__.py
"""
Importa todos os modelos da aplicação em ordem correta,
garantindo que o SQLAlchemy reconheça todas as classes antes
de inicializar o mapeamento.
"""

from .cliente import Cliente
from .equipamento import Equipamento
from .servico_equipamento import ServicoEquipamento
from .servico import Servico
from .pagamento import Pagamento
from .custo import Custo
