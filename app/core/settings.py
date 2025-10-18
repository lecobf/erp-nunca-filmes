# app/core/settings.py
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Configurações globais do ERP.
    Compatível com Render e ambientes locais.
    """

    # ============================================================
    # 🔹 Ambiente e informações básicas
    # ============================================================
    ENVIRONMENT: str = Field(default=os.getenv("ENVIRONMENT", "devlocal"))
    APP_NAME: str = Field(default=os.getenv("APP_NAME", "ERP Backend"))
    DEBUG: bool = Field(default=os.getenv("DEBUG", "false").lower() == "true")

    # ============================================================
    # 🔹 Banco de dados
    # ============================================================
    DATABASE_URL: str = Field(
        default=os.getenv("DATABASE_URL", "sqlite:///./erp_local.db")
    )

    # ============================================================
    # 🔹 Configuração de CORS
    # ============================================================
    # Render envia a variável CORS_ORIGINS como uma string separada por vírgulas.
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "https://erp-frontend.onrender.com,https://*.onrender.com"
            ).split(",")
            if origin.strip()
        ]
    )

    # ============================================================
    # 🔹 Inicialização e logs
    # ============================================================
    def __init__(self, **data):
        super().__init__(**data)

        print(f"[SETTINGS] Ambiente: {self.ENVIRONMENT}")
        print(f"[SETTINGS] APP_NAME: {self.APP_NAME}")
        print(f"[SETTINGS] DEBUG: {self.DEBUG}")
        print(f"[SETTINGS] Database URL: {self.DATABASE_URL}")
        print(f"[SETTINGS] CORS_ORIGINS: {self.CORS_ORIGINS}")


# ============================================================
# Singleton (instância única)
# ============================================================
settings = Settings()
