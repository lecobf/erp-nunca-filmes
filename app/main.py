import os
import multiprocessing
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ============================================================
# 🔹 Proteção para ambientes com multiprocessing (Windows)
# ============================================================
multiprocessing.freeze_support()

# ============================================================
# 🔹 Carrega variáveis de ambiente (.env)
# ============================================================
if os.getenv("RENDER", "false").lower() in ("true", "1", "yes"):
    print("[ENV] Render environment detected — skipping .env load")
else:
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(dotenv_path=env_path)
    print(f"[ENV] Variáveis carregadas de: {env_path}")

# ============================================================
# 🔹 Importações internas
# ============================================================
from app.core.settings import settings
from app.core.db import Base, engine

# Routers existentes
from app.routers.clientes import router as clientes_router
from app.routers.servicos import router as servicos_router
from app.routers.pagamentos import router as pagamentos_router
from app.routers.custos import router as custos_router
from app.routers.equipamentos import router as equipamentos_router
from app.routers.dashboard import router as dashboard_router

# ============================================================
# 🔹 Inicialização do aplicativo FastAPI
# ============================================================
app = FastAPI(title="ERP Backend", version="1.0")

# ============================================================
# 🔹 Configuração de CORS (dinâmica via .env)
# ============================================================
# ============================================================
# 🔹 Configuração de CORS (dinâmica via .env com suporte a wildcard)
# ============================================================
import re

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env.strip():
    raw_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    raw_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Divide entre origens exatas e padrões wildcard
allowed_exact = [o for o in raw_origins if "*" not in o]
allowed_regex = [o for o in raw_origins if "*" in o]

# Converte wildcards em expressões regulares (para CORSMiddleware)
regex_patterns = []
for pattern in allowed_regex:
    regex = re.escape(pattern).replace("\\*", ".*")
    regex_patterns.append(f"^{regex}$")

print("[CORS] Origens exatas permitidas:", allowed_exact)
if regex_patterns:
    print("[CORS] Padrões de regex ativos:", regex_patterns)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_exact,
    allow_origin_regex="|".join(regex_patterns) if regex_patterns else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 🔹 Inicialização do banco de dados
# ============================================================
print("[INIT] Criando/verificando tabelas no banco de dados...")
Base.metadata.create_all(bind=engine)

# ============================================================
# 🔹 Registro das rotas principais
# ============================================================
app.include_router(clientes_router)
app.include_router(servicos_router)
app.include_router(pagamentos_router)
app.include_router(custos_router)
app.include_router(equipamentos_router)
app.include_router(dashboard_router)

# ============================================================
# 🔹 Rotas de status e debug
# ============================================================
@app.get("/health")
def health():
    """Rota de status para monitoramento (usada pelo Render)."""
    return {
        "status": "ok",
        "env": settings.ENV,
        "database_url": settings.DATABASE_URL,
    }


@app.get("/debug-env")
def debug_env():
    """Mostra informações úteis de ambiente (somente para debug)."""
    return {
        "cwd": os.getcwd(),
        "ENV": settings.ENV,
        "DATABASE_URL": settings.DATABASE_URL,
        "CORS_ORIGINS": settings.CORS_ORIGINS,
    }

# ============================================================
# 🔹 Execução local
# ============================================================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"[START] Iniciando servidor em 0.0.0.0:{port}")
    print(f"[INFO] Ambiente: {settings.ENV}")
    print(f"[INFO] Banco de dados: {settings.DATABASE_URL}")
    print(f"[INFO] CORS permitido para: {allowed_origins}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
