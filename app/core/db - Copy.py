# core/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import get_settings

# ============================================================
# 🔹 Carrega as configurações globais
# ============================================================
settings = get_settings()
DB_PATH = settings.DB_PATH

# Garante que a pasta do banco existe
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ============================================================
# 🔹 Configuração do SQLAlchemy
# ============================================================
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Necessário para SQLite + threads
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# ============================================================
# 🔹 Log informativo
# ============================================================
print(f"[DATABASE] Usando arquivo SQLite em: {DB_PATH}")
