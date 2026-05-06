-- ============================================================
-- SCRIPT DE MIGRAÇÃO - Autenticação JWT
-- Executar ANTES de fazer deploy
-- ============================================================

-- Passo 1: criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR NOT NULL,
    email   VARCHAR NOT NULL UNIQUE,
    senha_hash VARCHAR NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);
CREATE INDEX IF NOT EXISTS ix_usuarios_id    ON usuarios (id);

-- Passo 2: adicionar colunas usuario_id nas tabelas existentes
ALTER TABLE clientes    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE servicos    ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE pagamentos  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE custos      ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);

-- Passo 3: associar registros existentes ao admin
-- Executar APÓS o primeiro deploy (o app cria o usuário admin no startup)
-- UPDATE clientes     SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE servicos     SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE pagamentos   SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE custos       SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE equipamentos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
