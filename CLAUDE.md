# CLAUDE.md — ERP NUNCA FILMES
# Contexto completo de desenvolvimento, produção e infraestrutura

---

## 1. OBJETIVO DESTE DOCUMENTO

Este documento é o contexto técnico e operacional principal para o Claude Code trabalhar no ERP da NUNCA FILMES.

O objetivo é garantir que o Claude tenha conhecimento suficiente sobre:

- arquitetura atual do ERP;
- localização do código;
- estrutura de produção;
- VM Oracle Cloud;
- DNS e Cloudflare;
- Nginx;
- backend FastAPI/Gunicorn;
- frontend React/Vite;
- PostgreSQL;
- systemd;
- fluxo de atualização via GitHub;
- procedimento de deploy;
- comandos de diagnóstico;
- cuidados de segurança;
- e limites sobre o que deve ou não ser alterado.

O Claude NÃO deve presumir que a infraestrutura antiga utilizada pelo Render ainda representa a produção atual.

A infraestrutura atual do ERP está hospedada em uma VM da Oracle Cloud.

---

## 2. RESUMO EXECUTIVO

```
INTERNET
   |
   v
erp.nuncafilmes.com
   |
   v
CLOUDFLARE
   |
   | DNS A
   | 167.126.3.17
   | Proxy ON
   v
ORACLE CLOUD VM
Ubuntu 22.04
167.126.3.17
   |
   v
NGINX
   |
   +-----------------------------+
   |                             |
   v                             v
FRONTEND                      BACKEND
React/Vite                    FastAPI
   |                          Gunicorn
   |                             |
   v                             v
dist/                         :8000
                                 |
                                 v
                              PostgreSQL
                                 |
                                 v
                              financas
```

---

## 3. INFRAESTRUTURA DE PRODUÇÃO

- **OS:** Ubuntu 22.04
- **Usuário:** ubuntu
- **IP público:** 167.126.3.17
- **Instância:** instance-20260505-1811
- **Memória:** ~956 MB de RAM, **sem swap**

⚠️ A VM não aguenta `npm install`/`npm ci`/`npm run build`: esgota a memória e a
VM trava (nem o SSH responde; só volta com Reboot pela Oracle Cloud). O build do
frontend é SEMPRE feito na máquina local e enviado pronto por `scp` (seção 14).

---

## 4. ACESSO SSH À VM

```bash
ssh -i "C:\projetos\ssh-key-2026-05-05.key" ubuntu@167.126.3.17
```

A chave privada SSH:
- NÃO deve ser colocada no GitHub
- NÃO deve ser colocada no repositório
- NÃO deve ser incluída neste arquivo
- NÃO deve ser exposta em logs

---

## 5. DOMÍNIO DO ERP

```
erp.nuncafilmes.com → Cloudflare DNS A → 167.126.3.17 → Oracle Cloud VM
```

- Type: A | Name: erp | Content: 167.126.3.17 | Proxy: ON

O ERP usa registro DNS A direto. Não confundir com Cloudflare Tunnel (que é do PhoneFlow).

---

## 6. LOCALIZAÇÃO DO PROJETO NA VM

```
/home/ubuntu/erp-nunca-filmes
```

```
erp-nunca-filmes/
├── app/
├── venv/
├── nunca-frontend/
├── .env
├── requirements.txt
└── ...
```

---

## 7. STACK

- Backend: Python 3.12 + FastAPI + Gunicorn (UvicornWorker) — porta 8000
- Frontend: React + Vite — build em `nunca-frontend/dist`
- Banco de dados: PostgreSQL 14 (local na VM) — banco `financas`
- ORM: SQLAlchemy (sem Alembic — tabelas criadas via `Base.metadata.create_all`)

---

## 8. ESTRUTURA DO CÓDIGO

- `app/` — backend FastAPI
- `app/main.py` — entrada da aplicação
- `app/core/db.py` — configuração do banco e engine SQLAlchemy
- `app/core/settings.py` — configurações via pydantic-settings
- `app/core/security.py` — JWT, hashing de senha
- `app/models/` — modelos SQLAlchemy
- `app/routers/` — endpoints da API
- `app/schemas/` — schemas Pydantic
- `nunca-frontend/` — frontend React + Vite

---

## 9. AMBIENTE LOCAL

- DATABASE_URL=postgresql+psycopg://postgres:postgres123@localhost:5432/nunca_filmes
- Backend inicia com: `uvicorn app.main:app --reload --port 8000`
- Frontend inicia com: `cd nunca-frontend && npm run dev`

---

## 10. BACKEND — SYSTEMD

Serviço: `erp-backend.service`

```ini
[Unit]
Description=ERP Nunca Filmes Backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/erp-nunca-filmes
EnvironmentFile=/home/ubuntu/erp-nunca-filmes/.env
ExecStart=/home/ubuntu/erp-nunca-filmes/venv/bin/gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 11. NGINX

- Frontend: `root /home/ubuntu/erp-nunca-filmes/nunca-frontend/dist`
- Backend: `proxy_pass http://127.0.0.1:8000/`
- `server_name nuncafilmes.duckdns.org erp.nuncafilmes.com`

Portas ativas: 80, 443, 8080

O site pessoal de Leco Petersen roda no mesmo Nginx na porta 8080:
```nginx
listen 8080;
root /var/www/lecopetersen;
```
Qualquer alteração no Nginx deve considerar ambos os projetos.

---

## 12. POSTGRESQL

- Database: `financas`
- User: `financeuser`
- Host: `localhost`
- Port: `5432`
- Versão: PostgreSQL 14
- `listen_addresses = *` (hardening futuro pendente)

---

## 13. PORTAS DA VM

| Porta | Serviço |
|-------|---------|
| 80    | Nginx |
| 443   | Nginx |
| 8080  | Nginx (site Leco) |
| 8000  | Gunicorn |
| 5432  | PostgreSQL |

UFW ativo com todas abertas. Oracle Cloud tem camada de rede própria acima do UFW.

---

## 14. PROCEDIMENTO PADRÃO DE DEPLOY

Regra: **nada de `npm` na VM** (ver seção 3). O frontend é compilado na máquina
local (Windows) e só a pasta `dist` pronta vai para a VM por `scp`. O backend
(Python) não tem etapa de build: o código chega pelo `git pull` na VM, que é leve.

### 14.1 Backend — na VM (via GitHub)

```bash
ssh -i "C:\projetos\ssh-key-2026-05-05.key" ubuntu@167.126.3.17

cd ~/erp-nunca-filmes
git status          # conferir alterações locais antes do pull
git pull

source venv/bin/activate
pip install -r requirements.txt   # leve; necessário só se requirements.txt mudou
sudo systemctl restart erp-backend
sudo systemctl status erp-backend --no-pager
```

### 14.2 Frontend — build local (PowerShell na máquina local)

```powershell
cd C:\projetos\erp-nunca-filmes
git checkout main
git pull

cd nunca-frontend
# pare o `npm run dev` antes (no Windows ele trava o esbuild.exe e o npm ci falha com EPERM)
npm ci
npm run build       # modo production; lê .env.production e .env.production.local

# conferir se a chave do Google Maps entrou no build
Select-String -Path dist\assets\*.js -Pattern "AIza" -List | Select-Object Filename

tar -czf ..\dist.tar.gz dist
scp -i "C:\projetos\ssh-key-2026-05-05.key" ..\dist.tar.gz ubuntu@167.126.3.17:~/
```

### 14.3 Frontend — publicar na VM

```bash
cd ~/erp-nunca-filmes/nunca-frontend
mv dist dist.backup-$(date +%Y%m%d-%H%M%S)   # rollback: voltar esta pasta para dist
tar -xzf ~/dist.tar.gz -C .
ls dist dist/assets
rm ~/dist.tar.gz
```

O Nginx serve `nunca-frontend/dist` direto: trocar a pasta já publica, sem
reiniciar. Só rode `sudo nginx -t && sudo systemctl restart nginx` se a
configuração do Nginx tiver mudado.

Depois testar: https://erp.nuncafilmes.com (Ctrl+Shift+R para ignorar o cache)

### 14.4 Variáveis do módulo Rotas (Google Maps)

Valores NUNCA no GitHub; só os nomes ficam documentados aqui.

| Onde | Arquivo (fora do git) | Variável |
|---|---|---|
| Backend (VM) | `~/erp-nunca-filmes/.env` (lido pelo systemd) | `GOOGLE_MAPS_API_KEY` — chave de servidor (Routes API) |
| Frontend (build local) | `nunca-frontend/.env.production.local` | `VITE_GOOGLE_MAPS_API_KEY` — chave de navegador (Maps JavaScript + Places New), restrita por domínio |
| Frontend (build local) | `nunca-frontend/.env.production.local` | `VITE_GOOGLE_MAPS_MAP_ID` — Map ID |

Localmente: `CONFIGURAR_GOOGLE_MAPS.bat` cria `nunca-frontend/.env.devlocal.local`
e `.env.google.local` (lido pelo backend via python-dotenv).

---

## 15. DIAGNÓSTICO

```bash
# Backend
sudo systemctl status erp-backend --no-pager
sudo journalctl -u erp-backend -n 100 --no-pager

# Nginx
sudo nginx -t
sudo nginx -T 2>/dev/null | grep -E "server_name|proxy_pass|root|listen"

# Portas
sudo ss -lntp

# Firewall
sudo ufw status numbered

# PostgreSQL
sudo systemctl status postgresql --no-pager
sudo -u postgres psql -c "\l"
sudo -u postgres psql -c "\du"
```

---

## 16. REGRAS DE SEGURANÇA

Antes de modificar Nginx, systemd, PostgreSQL, UFW, Oracle Cloud, Cloudflare, DNS, .env, JWT, SSH, certificados, portas ou banco de produção — o Claude deve:

1. Identificar o estado atual
2. Explicar o que pretende modificar
3. Verificar dependências
4. Evitar comandos destrutivos
5. Testar antes de aplicar
6. Verificar o serviço após a alteração

**Regra absoluta:** Nenhuma senha, chave SSH, JWT secret ou credencial deve ser commitada no GitHub ou aparecer neste arquivo.

---

## 17. HARDENING FUTURO (TAREFA SEPARADA)

Pendências de segurança a tratar em tarefa específica — NÃO misturar com deploy normal:

- Restringir `listen_addresses` do PostgreSQL
- Avaliar fechar porta 5432 externamente
- Avaliar bind do Gunicorn para `127.0.0.1:8000`
- Revisar pg_hba.conf
- Revisar regras UFW e Oracle Cloud Security Lists
- Revisar HTTPS/TLS/headers no Nginx
- Rotação da senha do `financeuser` (exposta durante investigação)

---

## 18. INFRAESTRUTURA ANTIGA — RENDER

O ERP teve infraestrutura anterior no Render. Essa infra é histórica.
O Claude NÃO deve fazer alterações no Render esperando que isso altere a produção atual.

---

## 19. FLUXO DE VERDADE DO CÓDIGO

```
DESENVOLVIMENTO → GitHub → git pull na VM → Deploy → Validação
```

Não alterar a VM diretamente sem refletir no GitHub.
