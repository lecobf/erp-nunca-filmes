import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.settings import settings

# ============================================================
# 🔹 Configuração do SQLAlchemy dinâmica (SQLite ou Postgres)
# ============================================================
DATABASE_URL = settings.DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Necessário para evitar erro de threads no SQLite
    connect_args = {"check_same_thread": False}
    os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)

# Força o uso do driver psycopg3 em qualquer caso
from sqlalchemy.engine import make_url

# Garante que o esquema (dialeto) correto será usado
url = str(make_url(DATABASE_URL).set(drivername="postgresql+psycopg"))


connect_args = {"sslmode": "require"}

# Cria engine compatível com qualquer SGBD
engine = create_engine(
    url,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()

# ============================================================
# 🔹 Logs informativos
# ============================================================
if DATABASE_URL.startswith("sqlite"):
    print(f"[DATABASE] Usando SQLite local: {DATABASE_URL}")
else:
    print(f"[DATABASE] Conectado ao PostgreSQL: {DATABASE_URL}")
