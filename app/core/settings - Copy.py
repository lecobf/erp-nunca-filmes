# app/core/settings.py
from pydantic import BaseModel
import os

class Settings(BaseModel):
    ENV: str = os.getenv("ENV", "devlocal")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app/dados/nunca.db")
    # CORS: lista separada por vírgula (sem espaços)
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

settings = Settings()
