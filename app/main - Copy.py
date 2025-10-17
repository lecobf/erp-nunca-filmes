# app/main.py
import os
import multiprocessing
from dotenv import load_dotenv

multiprocessing.freeze_support()

# ============================================================
# 🔹 Carrega variáveis de ambiente (.env)
# ============================================================
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)
print(f"[ENV] Carregando variáveis de: {env_path}")
print(f"[ENV] ERP_DB_PATH: {os.getenv('ERP_DB_PATH')}")

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.db import Base, engine
from .core.config import get_settings

# Routers
from .routers.clientes import router as clientes_router
from .routers.servicos import router as servicos_router
from .routers.pagamentos import router as pagamentos_router
from .routers.custos import router as custos_router
from .routers.equipamentos import router as equipamentos_router
from .routers.dashboard import router as dashboard_router

# ============================================================
# 🔹 Inicialização do aplicativo
# ============================================================
settings = get_settings()
app = FastAPI(title="ERP Backend", version="1.0")

# 🚀 Middleware CORS — permite chamadas do frontend (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 🔹 Configuração do CORS
# ============================================================
import os

# Lê a variável do .env e divide por vírgulas
cors_env = os.getenv("CORS_ORIGINS", "")
default_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

# Se não houver valor no .env, usa os padrões locais
if not default_origins:
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]


# Permite também valores definidos no .env (se existirem)
custom_origins = os.getenv("CORS_ORIGINS", "")
if custom_origins:
    default_origins.extend(o.strip() for o in custom_origins.split(",") if o.strip())

allow_origins = list(set(default_origins))  # remove duplicatas

print(f"[CORS] Origens permitidas: {allow_origins}")



# ============================================================
# 🔹 Inicialização do banco de dados
# ============================================================
print("[INIT] Criando/verificando tabelas no banco...")
Base.metadata.create_all(bind=engine)

# ============================================================
# 🔹 Registro das rotas
# ============================================================
app.include_router(clientes_router)
app.include_router(servicos_router)
app.include_router(pagamentos_router)
app.include_router(custos_router)
app.include_router(equipamentos_router)
app.include_router(dashboard_router)

# ============================================================
# 🔹 Rotas de saúde e debug
# ============================================================
@app.get("/health")
def health():
    return {"status": "ok", "db_path": settings.DB_PATH}

@app.get("/debug-env")
def debug_env():
    from .core.db import DB_PATH
    return {
        "db_path": DB_PATH,
        "cwd": os.getcwd(),
        "env_loaded": os.getenv("ERP_DB_PATH", "NÃO ENCONTRADO")
    }

# ============================================================
# 🔹 Execução direta (modo desenvolvimento)
# ============================================================
if __name__ == "__main__":
    port = int(getattr(settings, "PORT", os.getenv("PORT", 8000)))
    print(f"[START] Servidor iniciando em 0.0.0.0:{port}")
    print(f"[INFO] Banco de dados: {settings.DB_PATH}")
    print(f"[INFO] CORS permitido para: {allow_origins}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
