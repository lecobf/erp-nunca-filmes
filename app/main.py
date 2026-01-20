from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import os

# Importa os routers
from app.routers.clientes import router as clientes_router
from app.routers.servicos import router as servicos_router
from app.routers.pagamentos import router as pagamentos_router
from app.routers.custos import router as custos_router
from app.routers.equipamentos import router as equipamentos_router
from app.routers.dashboard import router as dashboard_router

# ============================================================
# 🔹 Inicialização da aplicação
# ============================================================
app = FastAPI(title="ERP Backend", version="1.0")

# ============================================================
# 🔹 Middleware CORS (oficial do FastAPI)
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://erp-nunca-filmes-1.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 🔹 Inclui routers
# ============================================================
app.include_router(clientes_router)
app.include_router(servicos_router)
app.include_router(pagamentos_router)
app.include_router(custos_router)
app.include_router(equipamentos_router)
app.include_router(dashboard_router)

# ============================================================
# 🔹 Healthcheck simples
# ============================================================
@app.get("/")
async def root():
    return {"status": "ok", "message": "ERP backend ativo e rodando com sucesso!"}

# ============================================================
# 🔹 Middleware global de CORS (versão dinâmica)
# ============================================================
@app.middleware("http")
async def ensure_cors(request, call_next):
    """
    Garante CORS válido para qualquer ambiente:
    - Local (http://localhost:5173)
    - Produção (https://erp-nunca-filmes-1.onrender.com)
    """
    response = await call_next(request)

    # Detecta ambiente de execução
    allowed_origin = "https://erp-nunca-filmes-1.onrender.com"
    if "localhost" in request.headers.get("origin", "") or "127.0.0.1" in request.headers.get("origin", ""):
        allowed_origin = request.headers.get("origin", allowed_origin)

    response.headers["Access-Control-Allow-Origin"] = allowed_origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# ============================================================
# 🔹 Ponto de entrada local
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
