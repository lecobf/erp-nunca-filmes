from sqlalchemy import create_engine, text

# Dados de conexão
DB_USER = "erp_app_user"
DB_PASSWORD = "novaSenha123"
DB_HOST = "dpg-d3q1mj56ubrc73fjcve0-a.oregon-postgres.render.com"
DB_NAME = "erp_db_dpl7"
DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?sslmode=require"

print("[TESTE] Tentando conectar ao banco de dados...")
print(f"[DEBUG] URL: {DB_URL.replace(DB_PASSWORD, '***')}")

try:
    engine = create_engine(DB_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.scalar()
        print("✅ Conexão bem-sucedida!")
        print(f"Versão do PostgreSQL: {version}")
except Exception as e:
    print("❌ Erro ao conectar:")
    print(e)
