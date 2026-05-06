-- ============================================================
-- SCRIPT DE MIGRAÇÃO - Autenticação JWT
-- Executar ANTES de fazer deploy
-- ============================================================

-- Passo 1: a tabela usuarios é criada automaticamente pelo create_all

-- Passo 2: adicionar colunas usuario_id nas tabelas existentes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE custos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);

-- Passo 3: criar usuário admin (executar APÓS o app subir pela primeira vez para gerar o hash)
-- O próprio app cria o admin no startup. Após isso, execute:
-- UPDATE clientes SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE servicos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE pagamentos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE custos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
-- UPDATE equipamentos SET usuario_id = (SELECT id FROM usuarios WHERE email = 'admin@nuncafilmes.com') WHERE usuario_id IS NULL;
