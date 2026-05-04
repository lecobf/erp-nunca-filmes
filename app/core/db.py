import os
import psycopg
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url

# ==============================
# 🎨 Cores ANSI para logs
# ==============================
class Colors:
    RESET = "\033[0m"
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    GRAY = "\033[90m"
    BOLD = "\033[1m"


Base = declarative_base()
SessionLocal = None
engine = None


# ==============================
# ⚙️ Funções utilitárias
# ==============================
def debug_log(message: str, color=Colors.GRAY):
    """Imprime logs coloridos apenas se DB_DEBUG=true"""
    if os.getenv("DB_DEBUG", "false").lower() in ("1", "true", "yes"):
        print(color + message + Colors.RESET)


def get_database_url() -> str:
    """
    Retorna uma URL válida para o banco de dados.
    Adiciona sslmode=require quando necessário.
    """
    url = os.getenv("DATABASE_URL")
    url = url.strip()

    if not url:
        print(f"{Colors.YELLOW}[WARN]{Colors.RESET} DATABASE_URL não encontrada. Usando SQLite local.")
        return "sqlite:///./app.db"

    # Corrige prefixos (Render/Railway/Neon)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Força sslmode=require (exceto local)
    if "sslmode=" not in url and "localhost" not in url:
        url += "?sslmode=require"

    return url


# ==============================
# 🔁 Dependência FastAPI
# ==============================
def get_db():
    """
    Cria e gerencia uma sessão de banco de dados para injeção de dependência.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==============================
# 🚀 Inicialização do banco
# ==============================
def init_engine():
    global engine, SessionLocal

    db_url = get_database_url()
    masked_url = db_url

    if "@" in db_url and ":" in db_url.split("@")[0]:
        masked_url = db_url.split("://")[0] + "://***:***@" + db_url.split("@")[1]

    debug_log(f"[DB-DEBUG] URL COMPLETA: {db_url}", Colors.MAGENTA)
    print(f"{Colors.CYAN}[DB]{Colors.RESET} URL detectada (mascarada): {masked_url}")

    # Teste direto com psycopg (removendo '+psycopg')
    try:
        direct_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)
        with psycopg.connect(direct_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                print(f"{Colors.GREEN}[DB]{Colors.RESET} Conexão direta OK ✅ ({version})")
    except Exception as e:
        print(f"{Colors.RED}[DB]{Colors.RESET} Falha na conexão direta ❌: {e}")

    # Cria o Engine SQLAlchemy
    try:
        url_obj = make_url(db_url)
        engine = create_engine(
            url_obj,
            pool_pre_ping=True,
            connect_args={"sslmode": "require"} if "localhost" not in db_url else {},
            future=True,
        )
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
        print(f"{Colors.GREEN}[DB]{Colors.RESET} Engine SQLAlchemy inicializado com sucesso ✅")
    except Exception as e:
        print(f"{Colors.RED}[DB]{Colors.RESET} Erro ao criar engine SQLAlchemy ❌: {e}")
        raise


# Inicializa automaticamente ao importar
init_engine()
