from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    ENV_FILE: str = Field(".env", description="Arquivo de variáveis de ambiente")
    DATABASE_URL: str = Field(..., description="URL de conexão com o banco de dados")
    DEBUG: bool = Field(default=False)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    logger.info(f"[ENV] Variáveis carregadas de: {os.path.abspath(settings.ENV_FILE)}")
    return settings

# Instância global compatível com o import do main.py
settings = get_settings()
