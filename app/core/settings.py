import os
from functools import lru_cache
from pydantic import BaseSettings, Field, AnyUrl, validator
from dotenv import load_dotenv

# ============================================================
# 🔹 Carrega .env local, se existir
# ============================================================
load_dotenv()

# ============================================================
# 🔹 Configurações principais
# ============================================================
class Settings(BaseSettings):
    # ---------------------------------------------------------
    # App info
    # ---------------------------------------------------------
    APP_NAME: str = Field("ERP Backend", description="Nome da aplicação")
    DEBUG: bool = Field(False, description="Modo de debug")
    ENVIRONMENT: str = Field("devlocal", description="Ambiente (devlocal, staging, prod)")
    VERSION: str = Field("1.0.0")

    # ---------------------------------------------------------
    # Banco de dados
    # ---------------------------------------------------------
    DATABASE_URL: str | None = Field(None, description="URL do banco de dados")

    @validator("DATABASE_URL", pre=True)
    def normalize_db_url(cls, v):
        """Corrige prefixos comuns e força driver psycopg."""
        if not v:
            return None
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+psycopg://", 1)
        elif v.startswith("postgresql://") and "+psycopg" not in v:
            v = v.replace("postgresql://", "postgresql+psycopg://", 1)

        if "sslmode=" not in v and "localhost" not in v:
            v += "?sslmode=require"
        return v

    # ---------------------------------------------------------
    # CORS / Frontend
    # ---------------------------------------------------------
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://*.onrender.com",
            "https://*.railway.app",
        ]
    )

    # ---------------------------------------------------------
    # Função de log bonitinha para debug
    # ---------------------------------------------------------
    def show_summary(self):
        print("======================================")
        print(f"[SETTINGS] APP_NAME: {self.APP_NAME}")
        print(f"[SETTINGS] DEBUG: {self.DEBUG}")
        print(f"[SETTINGS] ENVIRONMENT: {self.ENVIRONMENT}")
        print(f"[SETTINGS] VERSION: {self.VERSION}")
        print(f"[SETTINGS] DATABASE_URL: {self.DATABASE_URL}")
        print(f"[SETTINGS] CORS_ORIGINS: {self.CORS_ORIGINS}")
        print("======================================")

    class Config:
        env_file = ".env"
        case_sensitive = True


# ============================================================
# 🔹 Cacheia a instância para reuso (sem singleton global fixo)
# ============================================================
@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.show_summary()
    return settings
