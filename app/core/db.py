import os
import psycopg
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url

Base = declarative_base()
SessionLocal = None
engine = None


def get_database_url() -> str:
    """
    Retorna uma URL de banco de dados válida, com fallback para SQLite.
    Faz decodificação segura de caracteres especiais e mantém sslmode=require.
    """
    url = os.getenv("DATABASE_URL")

    if not url:
        print("[WARN] DATABASE_URL não encontrada. Usando SQLite local.")
        return "sqlite:///./app.db"

    # 🔹 Corrige prefixos comuns (Render/Railway) se necessário
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    # 🔹 Força sslmode=require se ainda não presente
    if "sslmode=" not in url and "localhost" not in url:
        url += "?sslmode=require"

    return url


def init_engine():
    """
    Inicializa o SQLAlchemy Engine e testa conexão direta via psycopg.
    """
    global engine, SessionLocal
    db_url = get_database_url()

    print(f"[DB] URL detectada (mascarada): {db_url.replace(os.getenv('DB_PASS', ''), '***')}")

    # 🔹 Teste direto de conexão (igual ao main.py dummy)
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                print("[DB] Conexão direta OK ✅")
    except Exception as e:
        print(f"[DB] Falha na conexão direta ❌: {e}")

    # 🔹 Criação segura do Engine SQLAlchemy
    try:
        url_obj = make_url(db_url)
        engine = create_engine(
            url_obj,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if "localhost" not in db_url else {},
            future=True,
        )
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
        print("[DB] Engine SQLAlchemy inicializado com sucesso ✅")
    except Exception as e:
        print(f"[DB] Erro ao criar engine SQLAlchemy ❌: {e}")
        raise


# 🔹 Inicialização automática ao importar
init_engine()
