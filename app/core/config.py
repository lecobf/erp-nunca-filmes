# core/config.py
import os
from functools import lru_cache
from pydantic import BaseModel


class Settings(BaseModel):
    """
    Configurações gerais do sistema ERP.
    """

    # ============================================================
    # 🔹 Caminho do banco de dados
    # ============================================================
    # Permite definir o caminho via variável de ambiente ERP_DB_PATH.
    # Se não estiver definida, usa o caminho padrão.
    # Exemplo de configuração:
    #   Linux/macOS: export ERP_DB_PATH="/srv/dropbox/nunca_filmes/pj/erp/dados/nunca.db"
    #   Windows PowerShell: setx ERP_DB_PATH "F:\Dropbox\NUNCA_FILMES\PJ\erp\dados\nunca.db"

    DB_PATH: str = os.getenv(
        "ERP_DB_PATH",
        r"F:\Dropbox\NUNCA_FILMES\PJ\erp\dados\nunca.db"
        if os.name == "nt"
        else "/srv/dropbox/nunca_filmes/pj/erp/dados/nunca.db",
    )

    # ============================================================
    # 🔹 URL de conexão SQLAlchemy
    # ============================================================
    DATABASE_URL: str = f"sqlite:///{DB_PATH}"

    # ============================================================
    # 🔹 Configuração de CORS
    # ============================================================
    CORS_ORIGINS: list[str] = ["*"]


@lru_cache
def get_settings() -> Settings:
    """
    Retorna as configurações de forma cacheada (singleton).
    """
    settings = Settings()
    print(f"[CONFIG] Banco de dados definido em: {settings.DB_PATH}")
    return settings
