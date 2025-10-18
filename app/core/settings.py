# app/core/settings.py
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Configurações globais do ERP.
    Compatível com Pydantic 2.x e Render.
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
    # 🔹 CORS
    # ============================================================
    # Render pode enviar CORS_ORIGINS vazio ou como string simples
    @staticmethod
    def _parse_cors_origins() -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "")
        if not raw:
            return [
                "https://erp-frontend.onrender.com",
                "https://*.onrender.com",
            ]
        # Permite JSON, lista ou string separada por vírgulas
        try:
            import json
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [o.strip() for o in parsed if o.strip()]
        except Exception:
            pass
        # fallback: string separada por vírgulas
        return [o.strip() for o in raw.split(",") if o.strip()]

    CORS_ORIGINS: List[str] = Field(default_factory=_parse_cors_origins)

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
