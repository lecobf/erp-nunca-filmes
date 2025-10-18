# core/config.py
import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    """
    Configurações gerais do sistema ERP.
    """

    # ============================================================
    # 🔹 Banco de Dados — prioridade para variável de ambiente
    # ============================================================
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DB_PATH: str = os.getenv(
        "ERP_DB_PATH",
        r"F:\Dropbox\NUNCA_FILMES\PJ\erp\dados\nunca.db"
        if os.name == "nt"
        else "/srv/dropbox/nunca_filmes/pj/erp/dados/nunca.db",
    )

    # Se DATABASE_URL não estiver definida, usa SQLite local (modo dev)
    if not DATABASE_URL:
        DATABASE_URL = f"sqlite:///{DB_PATH}"

    # ============================================================
    # 🔹 Configuração de CORS
    # ============================================================
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "https://erp-frontend.onrender.com,https://*.onrender.com"
    ).split(",")


@lru_cache
def get_settings() -> Settings:
    """
    Retorna as configurações de forma cacheada (singleton).
    """
    settings = Settings()

    print(f"[CONFIG] Database URL ativo: {settings.DATABASE_URL}")
    if settings.DATABASE_URL.startswith("sqlite"):
        print(f"[CONFIG] Usando SQLite local: {settings.DB_PATH}")
    else:
        print("[CONFIG] Usando PostgreSQL remoto (Render ou Neon)")

    return settings
