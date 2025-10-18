from pydantic import BaseModel
import os

class Settings(BaseModel):
    # ============================================================
    # 🔹 Ambiente e modo de execução
    # ============================================================
    ENV: str = os.getenv("ENV", "devlocal")  # devlocal / devremote / production

    # ============================================================
    # 🔹 Banco de dados
    # ============================================================
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./app/dados/nunca.db"  # fallback local
    )
    
if "render" in os.getenv("RENDER", "").lower() or os.getenv("RENDER_EXTERNAL_HOSTNAME"):
    print("[ENV] Render environment detected — skipping .env load")
else:
    from dotenv import load_dotenv
    load_dotenv()



    # ============================================================
    # 🔹 CORS — lista separada por vírgulas
    # ============================================================
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ]

    # ============================================================
    # 🔹 Outras configurações opcionais
    # ============================================================
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

settings = Settings()

print(f"[SETTINGS] Ambiente: {settings.ENV}")
print(f"[SETTINGS] Database URL: {settings.DATABASE_URL}")
print(f"[SETTINGS] CORS_ORIGINS: {settings.CORS_ORIGINS}")
