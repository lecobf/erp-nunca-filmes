from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text
import os

# Importa os routers
from app.routers.clientes import router as clientes_router
from app.routers.servicos import router as servicos_router
from app.routers.pagamentos import router as pagamentos_router
from app.routers.custos import router as custos_router
from app.routers.equipamentos import router as equipamentos_router
from app.routers.dashboard import router as dashboard_router
from app.routers.auth import router as auth_router

# Importa modelos e banco
from app.core.db import engine, SessionLocal
from app.models import *  # garante que todos os modelos são registrados
from app.core.db import Base
from app.models.usuario import Usuario
from app.core.security import hash_password


# ============================================================
# 🔹 Evento de startup
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria tabelas
    Base.metadata.create_all(bind=engine)

    # Cria usuário admin se não existir
    db: Session = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.email == "admin@nuncafilmes.com").first()
        if not admin:
            admin = Usuario(
                nome="Admin",
                email="admin@nuncafilmes.com",
                senha_hash=hash_password("admin123"),
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("[STARTUP] Usuário admin criado com sucesso.")

        admin_id = admin.id

        # Associa registros sem usuario_id ao admin
        for tabela in ("clientes", "servicos", "pagamentos", "custos", "equipamentos"):
            db.execute(
                text(f"UPDATE {tabela} SET usuario_id = :uid WHERE usuario_id IS NULL"),
                {"uid": admin_id},
            )
        db.commit()
        print("[STARTUP] Registros órfãos associados ao admin.")
    except Exception as e:
        print(f"[STARTUP] Erro: {e}")
        db.rollback()
    finally:
        db.close()

    yield


# ============================================================
# 🔹 Inicialização da aplicação
# ============================================================
app = FastAPI(title="ERP Backend", version="1.0", lifespan=lifespan)

# ============================================================
# 🔹 Middleware CORS (oficial do FastAPI)
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://nuncafilmes.duckdns.org",
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
app.include_router(auth_router)
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
    - Produção (https://nuncafilmes.duckdns.org)
    """
    response = await call_next(request)

    # Detecta ambiente de execução
    allowed_origin = "https://nuncafilmes.duckdns.org"
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
