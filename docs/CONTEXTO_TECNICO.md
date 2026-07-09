# Contexto Técnico — ERP Nunca Filmes

> Documento gerado para embasar a reescrita do sistema em Java + Spring Boot.  
> Stack atual: Python 3.12 · FastAPI · SQLAlchemy 2 · PostgreSQL · JWT (python-jose)

---

## 1. Modelo de Dados

### 1.1 Diagrama de Entidades e Relacionamentos (textual)

```
usuarios
  └──< clientes          (usuario_id FK)
  └──< equipamentos      (usuario_id FK)
  └──< servicos          (usuario_id FK)
         └──< servico_datas        (servico_id FK CASCADE)
         └──< servico_equipamentos (servico_id FK CASCADE)
         └──< pagamentos           (servico_id FK CASCADE)
         └──< custos               (servico_id FK CASCADE)
  └──< pagamentos        (usuario_id FK)
  └──< custos            (usuario_id FK)
equipamentos
  └──< servico_equipamentos (equipamento_id FK)
clientes
  └──< servicos          (cliente_id FK)
```

---

### 1.2 Tabela: `usuarios`

| Coluna       | Tipo    | Restrições              |
|--------------|---------|-------------------------|
| id           | INTEGER | PK, auto-increment      |
| nome         | VARCHAR | NOT NULL                |
| email        | VARCHAR | NOT NULL, UNIQUE, INDEX |
| senha_hash   | VARCHAR | NOT NULL                |

---

### 1.3 Tabela: `clientes`

| Coluna      | Tipo    | Restrições              |
|-------------|---------|-------------------------|
| id          | INTEGER | PK, auto-increment      |
| nome        | VARCHAR | NOT NULL                |
| email       | VARCHAR | nullable                |
| telefone    | VARCHAR | nullable                |
| cpf_cnpj    | VARCHAR | nullable                |
| usuario_id  | INTEGER | FK → usuarios.id, nullable |

---

### 1.4 Tabela: `equipamentos`

| Coluna         | Tipo    | Restrições              |
|----------------|---------|-------------------------|
| id             | INTEGER | PK, auto-increment, INDEX |
| nome           | VARCHAR | NOT NULL, INDEX         |
| categoria      | VARCHAR | nullable                |
| valor_aluguel  | FLOAT   | NOT NULL                |
| quantidade     | INTEGER | NOT NULL, default 0     |
| usuario_id     | INTEGER | FK → usuarios.id, nullable |

---

### 1.5 Tabela: `servicos`

| Coluna                    | Tipo    | Restrições                         |
|---------------------------|---------|-------------------------------------|
| id                        | INTEGER | PK, auto-increment                  |
| data_contratacao          | DATE    | NOT NULL                            |
| tipo_servico              | VARCHAR | NOT NULL (`"Job"` ou `"Aluguel"`)   |
| cliente_id                | INTEGER | FK → clientes.id                    |
| descricao                 | VARCHAR | nullable                            |
| valor_diaria_cache        | FLOAT   | NOT NULL, default 0.0               |
| valor_diaria_equipamentos | FLOAT   | NOT NULL, default 0.0               |
| valor_total               | FLOAT   | NOT NULL, default 0.0               |
| valor_desconto            | FLOAT   | default 0.0                         |
| valor_final               | FLOAT   | NOT NULL, default 0.0               |
| data_previsao_pagamento   | DATE    | NOT NULL                            |
| status                    | VARCHAR | default `"pendente"` (`pendente` / `parcial` / `pago`) |
| valor_pendente_atual      | FLOAT   | default 0.0 — saldo vivo atualizado |
| is_pacote                 | BOOLEAN | NOT NULL, default false             |
| usuario_id                | INTEGER | FK → usuarios.id, nullable          |

**Campos derivados (não persistidos, calculados na query):**
- `numero_diarias` → `COUNT(servico_datas)` para o serviço
- `valor_a_receber` → `MAX(valor_final − soma_pagamentos, 0)`
- `lucro_liquido` → `valor_final − soma_custos`
- `data_ultimo_pagamento` → `MAX(pagamentos.data_pagamento)`

---

### 1.6 Tabela: `servico_datas`

| Coluna      | Tipo    | Restrições                         |
|-------------|---------|-------------------------------------|
| id          | INTEGER | PK, auto-increment                  |
| servico_id  | INTEGER | FK → servicos.id, ON DELETE CASCADE |
| data        | DATE    | NOT NULL                            |

> Cada linha representa **uma diária** do serviço. O número de linhas é o `numero_diarias`.  
> `data_contratacao` do serviço é derivada da **menor data** desta tabela.

---

### 1.7 Tabela: `servico_equipamentos`

| Coluna             | Tipo    | Restrições                                           |
|--------------------|---------|-------------------------------------------------------|
| id                 | INTEGER | PK, auto-increment                                    |
| servico_id         | INTEGER | FK → servicos.id, NOT NULL, INDEX                     |
| equipamento_id     | INTEGER | FK → equipamentos.id, NOT NULL, INDEX                 |
| quantidade         | INTEGER | NOT NULL, default 1                                   |
| valor_unit_diaria  | FLOAT   | NOT NULL, default 0.0 — **preço congelado** no vínculo|
| subtotal_diaria    | FLOAT   | NOT NULL, default 0.0 — `quantidade × valor_unit_diaria` |

**Constraint:** `UNIQUE(servico_id, equipamento_id)` — mesmo equipamento não pode aparecer duas vezes no mesmo serviço.

---

### 1.8 Tabela: `pagamentos`

| Coluna          | Tipo    | Restrições              |
|-----------------|---------|-------------------------|
| id              | INTEGER | PK, auto-increment      |
| servico_id      | INTEGER | FK → servicos.id        |
| valor_pago      | FLOAT   | NOT NULL                |
| data_pagamento  | DATE    | default hoje            |
| valor_pendente  | FLOAT   | default 0 — **snapshot** do saldo no momento do pagamento |
| usuario_id      | INTEGER | FK → usuarios.id, nullable |

> `valor_pendente` aqui é histórico (imutável após inserção).  
> O saldo vivo atual fica em `servicos.valor_pendente_atual`.

---

### 1.9 Tabela: `custos`

| Coluna      | Tipo    | Restrições              |
|-------------|---------|-------------------------|
| id          | INTEGER | PK, auto-increment      |
| servico_id  | INTEGER | FK → servicos.id, NOT NULL |
| descricao   | VARCHAR | NOT NULL                |
| valor       | FLOAT   | NOT NULL                |
| data        | DATE    | default hoje            |
| usuario_id  | INTEGER | FK → usuarios.id, nullable |

---

## 2. Endpoints da API

### Convenções
- Todas as rotas (exceto `/auth/register` e `/auth/login`) exigem header `Authorization: Bearer <JWT>`.
- O `usuario_id` é extraído do token — nunca vem no body.
- Todos os endpoints filtram automaticamente pelo `usuario_id` do token (multi-tenant).
- Base URL local: `http://localhost:8000`

---

### 2.1 Autenticação — `/auth`

| Método | Rota              | Auth  | Descrição                                 |
|--------|-------------------|-------|-------------------------------------------|
| POST   | /auth/register    | ✗     | Cria usuário; retorna JWT + dados         |
| POST   | /auth/login       | ✗     | Autentica; retorna JWT + dados            |
| PUT    | /auth/me          | ✓     | Atualiza nome e/ou senha do usuário logado|
| GET    | /auth/users       | Admin | Lista todos os usuários                   |
| POST   | /auth/users       | Admin | Cria usuário (pelo admin)                 |
| PUT    | /auth/users/{id}  | Admin | Edita nome/senha de qualquer usuário      |
| DELETE | /auth/users/{id}  | Admin | Exclui usuário (não permite excluir admin)|

**Body POST /auth/register e POST /auth/users:**
```json
{ "nome": "string", "email": "string", "senha": "string" }
```

**Body POST /auth/login:**
```json
{ "email": "string", "senha": "string" }
```

**Response POST /auth/login e /auth/register:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "usuario_id": 1,
  "nome": "string",
  "email": "string"
}
```

**Body PUT /auth/me:**
```json
{ "nome": "string?", "senha_atual": "string?", "senha_nova": "string?" }
```

**Body PUT /auth/users/{id} (admin):**
```json
{ "nome": "string?", "senha_nova": "string?" }
```
> Admin não precisa informar `senha_atual` para trocar senha de outro usuário.

---

### 2.2 Clientes — `/clientes`

| Método | Rota                  | Descrição                                         |
|--------|-----------------------|---------------------------------------------------|
| GET    | /clientes             | Lista clientes do usuário; `?search=` (nome/email/telefone) |
| POST   | /clientes             | Cria cliente                                      |
| PUT    | /clientes/{id}        | Atualiza cliente                                  |
| DELETE | /clientes/{id}        | Exclui cliente                                    |
| GET    | /clientes/com-pagamentos | Lista clientes que possuem ao menos um pagamento |
| POST   | /clientes/importar    | Importa lista de clientes em massa                |

**Body POST/PUT /clientes:**
```json
{ "nome": "string", "email": "string?", "telefone": "string?", "cpf_cnpj": "string?" }
```

---

### 2.3 Equipamentos — `/equipamentos`

| Método | Rota                    | Descrição                         |
|--------|-------------------------|-----------------------------------|
| GET    | /equipamentos           | Lista equipamentos do usuário     |
| POST   | /equipamentos           | Cria equipamento                  |
| PUT    | /equipamentos/{id}      | Atualiza equipamento              |
| DELETE | /equipamentos/{id}      | Exclui equipamento                |
| POST   | /equipamentos/importar  | Importa lista de equipamentos     |

**Body POST/PUT /equipamentos:**
```json
{ "nome": "string", "categoria": "string?", "valor_aluguel": 0.0, "quantidade": 0 }
```

---

### 2.4 Serviços — `/servicos`

| Método | Rota                         | Descrição                                       |
|--------|------------------------------|-------------------------------------------------|
| GET    | /servicos                    | Lista serviços; filtros: `status`, `cliente_id`, `tipo_servico`, `ano`, `mes` |
| POST   | /servicos                    | Cria serviço                                    |
| PUT    | /servicos/{id}               | Atualiza serviço (recalcula valores e status)   |
| DELETE | /servicos/{id}               | Exclui serviço (cascade em datas, equip, pagamentos, custos) |
| GET    | /servicos/{id}               | Detalhe do serviço com equipamentos             |
| GET    | /servicos/periodo            | Lista por faixa de data de contratação          |
| GET    | /servicos/combo              | Lista simplificada p/ selects; `?pendentes=true` filtra apenas com saldo devedor |
| GET    | /servicos/calendario         | Serviços com ao menos uma data no intervalo `?inicio=&fim=` |
| GET    | /servicos/{id}/equipamentos  | Lista os equipamentos vinculados ao serviço     |

**Body POST/PUT /servicos:**
```json
{
  "tipo_servico": "Job|Aluguel",
  "cliente_id": 1,
  "descricao": "string?",
  "datas": ["2025-01-10", "2025-01-11"],
  "valor_diaria_cache": 0.0,
  "valor_diaria_equipamentos": 0.0,
  "valor_desconto": 0.0,
  "data_previsao_pagamento": "2025-02-10",
  "is_pacote": false,
  "equipamentos": [
    { "equipamento_id": 1, "quantidade": 1 }
  ]
}
```

**Response GET /servicos (campos incluídos):**
```json
{
  "id": 1,
  "data_contratacao": "2025-01-10",
  "tipo_servico": "Job",
  "cliente_id": 1,
  "cliente_nome": "string",
  "descricao": "string",
  "datas": ["2025-01-10"],
  "numero_diarias": 1,
  "valor_diaria_cache": 0.0,
  "valor_diaria_equipamentos": 0.0,
  "valor_total": 0.0,
  "valor_desconto": 0.0,
  "valor_final": 0.0,
  "data_previsao_pagamento": "2025-02-10",
  "status": "pendente",
  "valor_a_receber": 0.0,
  "lucro_liquido": 0.0,
  "is_pacote": false,
  "valor_pendente_atual": 0.0,
  "data_ultimo_pagamento": null
}
```

---

### 2.5 Pagamentos — `/pagamentos`

| Método | Rota                        | Descrição                                         |
|--------|-----------------------------|---------------------------------------------------|
| GET    | /pagamentos/resumo-receber  | Card informativo de a receber; filtros: `cliente_id`, `data_inicio`, `data_fim` (por `data_contratacao` do serviço) |
| GET    | /pagamentos                 | Lista pagamentos; filtros: `servico_id`, `cliente_id`, `ano`, `mes`, `data_inicio`, `data_fim` |
| POST   | /pagamentos                 | Registra pagamento; atualiza `valor_pendente_atual` e `status` do serviço |
| PUT    | /pagamentos/{id}            | Atualiza valor e data de um pagamento             |
| DELETE | /pagamentos/{id}            | Exclui pagamento                                  |

**Body POST /pagamentos:**
```json
{ "servico_id": 1, "valor_pago": 500.0, "data_pagamento": "2025-01-20" }
```

**Response GET /pagamentos/resumo-receber:**
```json
{
  "total_a_receber": 0.0,
  "count_pendentes": 0,
  "count_parciais": 0
}
```

---

### 2.6 Custos — `/custos`

| Método | Rota            | Descrição                                               |
|--------|-----------------|---------------------------------------------------------|
| GET    | /custos         | Lista todos os custos (com nome do serviço e cliente)   |
| POST   | /custos         | Cria custo vinculado a um serviço                       |
| PUT    | /custos/{id}    | Atualiza custo                                          |
| DELETE | /custos/{id}    | Exclui custo                                            |
| GET    | /custos/periodo | Lista por período; filtros: `ano`, `mes`, `data_inicio`, `data_fim` |

**Body POST/PUT /custos:**
```json
{ "servico_id": 1, "descricao": "string", "valor": 100.0, "data": "2025-01-10" }
```

---

### 2.7 Dashboard — `/dashboard`

| Método | Rota                              | Descrição                                              |
|--------|-----------------------------------|--------------------------------------------------------|
| GET    | /dashboard/periodo                | Resumo financeiro; filtros: `ano`, `data_inicio`, `data_fim` |
| GET    | /dashboard/top-clientes-pagamentos | Top 5 clientes por valor pago no ano (`?ano=`)        |

**Response GET /dashboard/periodo:**
```json
{
  "periodo": { "inicio": "2025-01-01", "fim": "2025-12-31" },
  "geral": {
    "receita_prevista_periodo": 0.0,
    "receita_recebida_periodo": 0.0,
    "receita_retroativa": 0.0,
    "a_receber_periodo": 0.0,
    "a_receber_retroativo": 0.0,
    "lucro_liquido": 0.0,
    "mensal": [
      { "mes": "2025-01", "valor": 0.0, "receita_recebida": 0.0 }
    ]
  },
  "job": { "...mesmo formato de geral..." },
  "aluguel": { "...mesmo formato de geral..." }
}
```

---

## 3. Segurança e Autenticação

### JWT
- Algoritmo: **HS256**
- Expiração: **24 horas**
- Chave secreta: variável de ambiente `JWT_SECRET_KEY` (fallback: `"nunca-filmes-secret-key-2024"`)
- Payload do token: `{ "sub": "<usuario_id>", "exp": <timestamp> }`
- Header: `Authorization: Bearer <token>`

### Hashing de Senhas
- Biblioteca: **passlib** com scheme **bcrypt**
- Versão fixada: `bcrypt==4.0.1` (compatibilidade com passlib 1.7.4)

### Perfil Admin
- Email fixo: `admin@nuncafilmes.com`
- Verificado em tempo de execução via query no banco (não há coluna `is_admin`)
- Endpoints admin retornam **403** para qualquer outro usuário

### CORS
Origens permitidas:
- `https://nuncafilmes.duckdns.org`
- `http://localhost:5173`
- `http://127.0.0.1:5173`

---

## 4. Configuração e Infraestrutura

### Variáveis de Ambiente

| Variável        | Obrigatória | Descrição                          |
|-----------------|-------------|-------------------------------------|
| DATABASE_URL    | Sim         | `postgresql+psycopg://user:pass@host:5432/db` |
| JWT_SECRET_KEY  | Recomendada | Chave secreta JWT (tem fallback)    |

### Banco de Dados
- **PostgreSQL** em produção
- Driver: `psycopg[binary]` (psycopg3)
- Criação de tabelas: `Base.metadata.create_all(engine)` no startup (sem Alembic/migrations)
- Pool de conexões: padrão SQLAlchemy

### Startup (`app/main.py` — lifespan)
1. Cria todas as tabelas se não existirem
2. Cria o usuário `admin@nuncafilmes.com` se não existir (senha padrão: `admin123`)

---

## 5. Estrutura de Pacotes

```
app/
├── main.py                  # FastAPI app, CORS, lifespan, inclusão de routers
├── core/
│   ├── db.py                # Engine, SessionLocal, get_db
│   ├── settings.py          # Pydantic-settings (DATABASE_URL, DEBUG)
│   └── security.py          # JWT encode/decode, bcrypt, get_current_user_id, OAuth2
├── models/
│   ├── usuario.py
│   ├── cliente.py
│   ├── equipamento.py
│   ├── servico.py
│   ├── servico_data.py
│   ├── servico_equipamento.py
│   ├── pagamento.py
│   └── custo.py
├── schemas/
│   ├── usuario.py           # UsuarioCreate, LoginRequest, TokenResponse, UsuarioUpdate, UsuarioOut
│   ├── cliente.py           # ClienteBase, ClienteOut
│   ├── equipamento.py       # EquipamentoCreate, EquipamentoUpdate, EquipamentoOut
│   ├── servico.py           # ServicoCreate, ServicoOut, ServicoEquipamentoIn/Out
│   ├── pagamento.py         # PagamentoCreate, PagamentoOut
│   └── custo.py             # CustoBase
├── routers/
│   ├── auth.py
│   ├── clientes.py
│   ├── equipamentos.py
│   ├── servicos.py
│   ├── pagamentos.py
│   ├── custos.py
│   └── dashboard.py
└── utils/
    ├── deps.py              # get_db (injeção de dependência da sessão)
    └── filtros.py           # aplicar_filtros_data (helper reutilizável)
```
