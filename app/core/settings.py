import os
import json
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlparse


# ============================================================
# 🔹 Carregamento de variáveis de ambiente
# ============================================================
def load_environment():
    """Carrega o arquivo .env da raiz do projeto, caso exista."""
    base_dir = Path(__file__).resolve().parent.parent  # app/core → app → erp/
    env_path = base_dir / ".env"

    # Detecta Render automaticamente
    if os.getenv("RENDER", None):
        print("[ENV] Render environment detected — skipping .env load")
        return

    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print(f"[ENV] Variáveis carregadas de: {env_path}")
    else:
        print(f"[ENV] Aviso: .env não encontrado em {env_path}")


load_environment()


# ============================================================
# 🔹 Classe principal de configurações
# ============================================================
class Settings(BaseSettings):
    """
    Configurações globais do ERP.
    Compatível com Pydantic 2.x e Render.
    """

    # Ambiente
    ENVIRONMENT: str = Field(default=os.getenv("ENVIRONMENT", "devlocal"))
    APP_NAME: str = Field(default=os.getenv("APP_NAME", "ERP Backend"))
    DEBUG: bool = Field(default=os.getenv("DEBUG", "false").lower() == "true")

    # Banco de dados
    DATABASE_URL: str = Field(
        default=os.getenv("DATABASE_URL", "sqlite:///./erp_local.db")
    )

    # Opção para mostrar senha completa no log
    LOG_FULL_DB_URL: bool = Field(
        default=os.getenv("LOG_FULL_DB_URL", "false").lower() == "true"
    )

    # CORS
    CORS_ORIGINS: Union[str, List[str], None] = Field(default=None)

    def __init__(self, **data):
        super().__init__(**data)

        # ============================================================
        # 🔍 Detecta driver e aplica fallback psycopg → psycopg2
        # ============================================================
        if self.DATABASE_URL.startswith("postgresql://"):
            # força psycopg
            self.DATABASE_URL = self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://")

        elif self.DATABASE_URL.startswith("postgresql+psycopg://"):
            try:
                import psycopg
                print("[DB-DEBUG] Driver psycopg detectado com sucesso ✅")
            except ImportError:
                print("[DB-DEBUG] psycopg não encontrado ❌ — aplicando fallback para psycopg2")
                self.DATABASE_URL = self.DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://")

        # ============================================================
        # 🔹 Processamento das origens CORS
        # ============================================================
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

        # ============================================================
        # 🧩 DEBUG DETALHADO DE CONEXÃO COM O BANCO
        # ============================================================
        try:
            parsed_url = urlparse(self.DATABASE_URL)
            print("[DB-DEBUG] ====== DEBUG DETALHADO DO BANCO ======")
            print(f"[DB-DEBUG] URL COMPLETA: {self.DATABASE_URL}")
            print(f"[DB-DEBUG] Driver: {parsed_url.scheme}")
            print(f"[DB-DEBUG] Usuário: {parsed_url.username}")
            if self.LOG_FULL_DB_URL:
                print(f"[DB-DEBUG] Senha: {parsed_url.password}")
            else:
                print("[DB-DEBUG] Senha: *** (oculta)")
            print(f"[DB-DEBUG] Host: {parsed_url.hostname}")
            print(f"[DB-DEBUG] Porta: {parsed_url.port}")
            print(f"[DB-DEBUG] Banco: {parsed_url.path.lstrip('/')}")
            print("[DB-DEBUG] ========================================")
        except Exception as e:
            print(f"[DB-DEBUG] Falha ao inspecionar DATABASE_URL: {e}")

        # ============================================================
        # 🔹 Logs gerais
        # ============================================================
        print(f"[SETTINGS] Ambiente: {self.ENVIRONMENT}")
        print(f"[SETTINGS] APP_NAME: {self.APP_NAME}")
        print(f"[SETTINGS] DEBUG: {self.DEBUG}")
        print(f"[SETTINGS] Database URL: {self.DATABASE_URL}")
        print(f"[SETTINGS] CORS_ORIGINS: {self.CORS_ORIGINS}")


# ============================================================
# 🔹 Singleton de configurações
# ============================================================
settings = Settings()
