# app/core/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url
from app.core.settings import settings

# ============================================================
# 🔹 Configuração dinâmica do SQLAlchemy
# ============================================================
DATABASE_URL = settings.DATABASE_URL
connect_args = {}

# --- SQLite local ---
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
    url = DATABASE_URL
else:
    # --- PostgreSQL (Render / Neon / etc.) ---
    url_obj = make_url(DATABASE_URL)
    # Garante que o driver psycopg3 será usado (novo padrão)
    if not url_obj.drivername.startswith("postgresql+psycopg"):
        url_obj = url_obj.set(drivername="postgresql+psycopg")
    url = str(url_obj)
    connect_args = {"sslmode": "require"}

# ============================================================
# 🔹 Criação da Engine
# ============================================================
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
    print(f"[DATABASE] Conectado ao PostgreSQL: {url}")
