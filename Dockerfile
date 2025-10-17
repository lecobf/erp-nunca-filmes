# ============================================================
# 🎬 ERP NUNCA FILMES - Backend FastAPI
# Dockerfile multi-stage para Render / produção
# Python 3.12 + Uvicorn + Gunicorn
# ============================================================

# -----------------------------
# 🔹 Etapa 1: Builder (instala dependências)
# -----------------------------
FROM python:3.12-slim AS builder

# Define diretório de trabalho
WORKDIR /app

# Atualiza pacotes básicos e instala dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Copia apenas arquivos necessários para cache de dependências
COPY requirements.txt .

# Instala dependências no ambiente isolado
RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt

# -----------------------------
# 🔹 Etapa 2: Runner (imagem final leve)
# -----------------------------
FROM python:3.12-slim

# Define diretório de trabalho
WORKDIR /app

# Copia dependências instaladas do builder
COPY --from=builder /install /usr/local

# Copia o código-fonte do backend
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY requirements.txt .
COPY scripts ./scripts

# Define variáveis de ambiente padrão
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENV=production

# Exposição da porta padrão FastAPI
EXPOSE 8000

# Comando padrão para produção (Render usa o $PORT automaticamente)
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
