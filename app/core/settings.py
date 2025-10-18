# app/core/settings.py
import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Configurações globais do ERP.
    Compatível com Pydantic 2.x e Render.
    """

    # ============================================================
    # 🔹 Ambiente
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
    # 🔹 CORS (pode vir como string, lista ou vazio)
    # ============================================================
    CORS_ORIGINS: Union[str, List[str], None] = Field(default=None)

    # ============================================================
    # 🔹 Inicialização e parsing manual
    # ============================================================
    def __init__(self, **data):
        super().__init__(**data)

        raw_cors = os.getenv("CORS_ORIGINS", "")
        parsed: List[str] = []

        if raw_cors:
            try:
                val = json.loads(raw_cors)
                if isinstance(val, list):
                    parsed = [v.strip() for v in val if v.strip()]
                elif isinstance(val, str):
                    parsed = [v.strip() for v in val.split(",") if v.strip()]
            except Exception:
                parsed = [v.strip() for v in raw_cors.split(",") if v.strip()]
        else:
            parsed = [
                "https://erp-frontend.onrender.com",
                "https://*.onrender.com",
            ]

        self.CORS_ORIGINS = parsed

        # Logs
        print(f"[SETTINGS] Ambiente: {self.ENVIRONMENT}")
        print(f"[SETTINGS] APP_NAME: {self.APP_NAME}")
        print(f"[SETTINGS] DEBUG: {self.DEBUG}")
        print(f"[SETTINGS] Database URL: {self.DATABASE_URL}")
        print(f"[SETTINGS] CORS_ORIGINS: {self.CORS_ORIGINS}")


# ============================================================
# Singleton
# ============================================================
settings = Settings()
