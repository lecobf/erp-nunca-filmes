# app/core/settings.py
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configurações gerais do backend ERP.
    """

    # Ambiente (devlocal, production etc.)
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "devlocal")

    # Banco de dados
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./erp_local.db")

    # CORS
    CORS_ORIGINS: list[str] = (
        os.getenv("CORS_ORIGINS", "*")
        .replace(" ", "")
        .split(",")
    )

    # Nome da aplicação
    APP_NAME: str = os.getenv("APP_NAME", "ERP Backend")

    # Debug
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


# ============================================================
# 🔹 Carregamento condicional do .env (Render vs local)
# ============================================================

if "render" in os.getenv("RENDER", "").lower() or os.getenv("RENDER_EXTERNAL_HOSTNAME"):
    print("[ENV] Render environment detected — skipping .env load")
else:
    from dotenv import load_dotenv

    load_dotenv()
    print("[ENV] .env file loaded successfully (local mode)")


# ============================================================
# 🔹 Inicialização única (singleton)
# ============================================================

settings = Settings()

# Debug extra (útil no Render)
print(f"[SETTINGS] Ambiente: {settings.ENVIRONMENT}")
print(f"[SETTINGS] Database URL: {settings.DATABASE_URL}")
print(f"[SETTINGS] CORS_ORIGINS: {settings.CORS_ORIGINS}")
