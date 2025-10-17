"""
===========================================================
🎯 Script de migração: SQLite → PostgreSQL
ERP NUNCA FILMES - FastAPI + SQLAlchemy
===========================================================

Uso:
    PYTHONPATH=. \
    SQLITE_URL=sqlite:///./app/dados/nunca.db \
    PG_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<dbname> \
    python -m scripts.migrate_sqlite_to_postgres

O script:
 - Lê as models definidas em app.models.*
 - Copia dados de todas as tabelas para o Postgres
 - Mantém os IDs originais e relações
"""

import os
import sys
import importlib
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.core.db import Base

# ============================================================
# 1️⃣ URLs de conexão
# ============================================================

SQLITE_URL = os.getenv("SQLITE_URL")
PG_URL = os.getenv("PG_URL")

if not SQLITE_URL or not PG_URL:
    print("❌ Erro: defina as variáveis de ambiente SQLITE_URL e PG_URL antes de executar.")
    sys.exit(1)

print(f"📦 SQLite origem: {SQLITE_URL}")
print(f"🗄️ PostgreSQL destino: {PG_URL}")

# ============================================================
# 2️⃣ Carrega models dinamicamente
# ============================================================

def load_all_models():
    """Importa todos os módulos em app.models.*"""
    models_pkg = "app.models"
    try:
        pkg = importlib.import_module(models_pkg)
        pkg_path = pkg.__path__[0]
        for filename in os.listdir(pkg_path):
            if filename.endswith(".py") and filename != "__init__.py":
                importlib.import_module(f"{models_pkg}.{filename[:-3]}")
        print("✅ Models carregados com sucesso.")
    except Exception as e:
        print(f"⚠️ Erro ao carregar models: {e}")


load_all_models()

# ============================================================
# 3️⃣ Cria engines e sessões
# ============================================================

sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
pg_engine = create_engine(PG_URL, pool_pre_ping=True)

SQLiteSession = sessionmaker(bind=sqlite_engine)
PGSession = sessionmaker(bind=pg_engine)

sqlite_session = SQLiteSession()
pg_session = PGSession()

# ============================================================
# 4️⃣ Cria tabelas no Postgres (caso ainda não existam)
# ============================================================

print("🧱 Criando tabelas no Postgres (se necessário)...")
Base.metadata.create_all(pg_engine)

# ============================================================
# 5️⃣ Função principal de migração
# ============================================================

def migrate_table(model_class):
    table_name = model_class.__tablename__
    print(f"➡️ Migrando tabela: {table_name}")

    # Lê todos os registros da tabela SQLite
    rows = sqlite_session.query(model_class).all()
    if not rows:
        print(f"   ⚪ Nenhum registro encontrado.")
        return

    # Copia os dados para o Postgres
    try:
        for row in rows:
            # Cria um novo objeto e copia os campos
            data = row.__dict__.copy()
            data.pop("_sa_instance_state", None)
            pg_session.merge(model_class(**data))
        pg_session.commit()
        print(f"   ✅ {len(rows)} registros migrados com sucesso.")
    except Exception as e:
        pg_session.rollback()
        print(f"   ❌ Erro ao migrar {table_name}: {e}")


# ============================================================
# 6️⃣ Executa migração para todas as tabelas registradas
# ============================================================

inspector = inspect(sqlite_engine)
sqlite_tables = inspector.get_table_names()
print(f"🔎 Tabelas detectadas: {sqlite_tables}")

for cls in Base.__subclasses__():
    if hasattr(cls, "__tablename__") and cls.__tablename__ in sqlite_tables:
        migrate_table(cls)

# ============================================================
# 7️⃣ Finaliza
# ============================================================

sqlite_session.close()
pg_session.close()

print("✅ Migração concluída com sucesso!")
