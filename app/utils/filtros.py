# app/utils/filtros.py
from sqlalchemy import func
from datetime import datetime

def aplicar_filtros_data(query, coluna, ano=None, mes=None, data_inicio=None, data_fim=None):
    """
    Aplica filtros de data compatíveis com PostgreSQL.
    - ano: filtra por ano (func.extract)
    - mes: filtra por mês (func.extract)
    - data_inicio/data_fim: filtram intervalo completo (string YYYY-MM-DD)
    """
    if ano:
        query = query.filter(func.extract("year", coluna) == ano)
    if mes:
        query = query.filter(func.extract("month", coluna) == mes)
    if data_inicio and data_fim:
        try:
            dt_ini = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            dt_fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
            query = query.filter(coluna.between(dt_ini, dt_fim))
        except ValueError:
            pass  # ignora se formato estiver errado
    return query
