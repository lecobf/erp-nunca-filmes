from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session

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
# 🔹 Inclui routers (ordem importa: CORS vem antes!)
# ============================================================
app.include_router(clientes_router)
app.include_router(servicos_router)
app.include_router(pagamentos_router)
app.include_router(custos_router)
app.include_router(equipamentos_router)
app.include_router(dashboard_router)


# ============================================================
# 🔹 Healthcheck simples (opcional, útil para o Render)
# ============================================================
@app.get("/")
async def root():
    return {"status": "ok", "message": "ERP backend ativo e rodando com sucesso!"}


# ============================================================
# 🔹 Middleware global de CORS (garantia absoluta)
# ============================================================
@app.middleware("http")
async def ensure_cors(request, call_next):
    """
    Este middleware garante que TODAS as respostas (inclusive erros e JSONResponse)
    tenham cabeçalhos CORS válidos, independentemente do middleware padrão.
    """
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "https://erp-nunca-filmes-1.onrender.com"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# ============================================================
# 🔹 Ponto de entrada (usado localmente, Render ignora isso)
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
