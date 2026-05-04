# ERP Nunca Filmes — Contexto do Projeto

## Descrição
Sistema de gestão (ERP) para uma produtora de filmes chamada Nunca Filmes.

## Stack
- Backend: Python 3.12 + FastAPI + Uvicorn (porta 8000)
- Frontend: React + Vite (porta 5173)
- Banco de dados: PostgreSQL
- ORM: SQLAlchemy (sem Alembic — tabelas criadas via Base.metadata.create_all)
- Deploy: Render.com (backend + PostgreSQL)

## Estrutura
- `app/` — backend FastAPI
- `app/main.py` — entrada da aplicação
- `app/core/db.py` — configuração do banco e engine SQLAlchemy
- `app/core/settings.py` — configurações via pydantic-settings
- `app/models/` — modelos SQLAlchemy (clientes, servicos, pagamentos, custos, equipamentos)
- `app/routers/` — endpoints da API (clientes, servicos, pagamentos, custos, equipamentos, dashboard)
- `app/schemas/` — schemas Pydantic
- `nunca-frontend/` — frontend React + Vite

## Ambiente Local
- DATABASE_URL=postgresql+psycopg://postgres:postgres123@localhost:5432/nunca_filmes
- Backend inicia com: uvicorn app.main:app --reload --port 8000
- Frontend inicia com: cd nunca-frontend && npm run dev

## Observações
- O .env local é lido pelo Python via python-dotenv e pydantic-settings
- O deploy no Render usa o banco PostgreSQL do próprio Render
- O frontend consome a API em http://localhost:8000 localmente
- Nunca usar Alembic — migrações são feitas via Base.metadata.create_all
