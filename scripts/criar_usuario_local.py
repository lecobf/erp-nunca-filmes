"""
Cria (ou redefine a senha de) um usuário no banco LOCAL, para testes.

Uso, na raiz do projeto:
    .\\venv\\Scripts\\python.exe scripts\\criar_usuario_local.py
    .\\venv\\Scripts\\python.exe scripts\\criar_usuario_local.py email@x.com minhasenha "Meu Nome"

Sem argumentos usa teste@local.com / teste123. Lê o DATABASE_URL do .env e
se recusa a rodar se ele não apontar para localhost (nunca mexe em produção).
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
load_dotenv(RAIZ / ".env")

url = os.getenv("DATABASE_URL") or ""
if url and "localhost" not in url and "127.0.0.1" not in url:
    sys.exit("DATABASE_URL não aponta para localhost. Script só roda no banco local.")

from app.core import db  # noqa: E402  (configura o banco na importação)
from app.core.security import hash_password  # noqa: E402
from app.models import Usuario  # noqa: E402

email = sys.argv[1] if len(sys.argv) > 1 else "teste@local.com"
senha = sys.argv[2] if len(sys.argv) > 2 else "teste123"
nome = sys.argv[3] if len(sys.argv) > 3 else "Usuário de Teste"

db.Base.metadata.create_all(bind=db.engine)
sessao = db.SessionLocal()
try:
    print("\nUsuários existentes:")
    for u in sessao.query(Usuario).order_by(Usuario.id).all():
        print(f"  #{u.id}  {u.email}  ({u.nome})")

    usuario = sessao.query(Usuario).filter(Usuario.email == email).first()
    if usuario:
        usuario.senha_hash = hash_password(senha)
        acao = "Senha redefinida"
    else:
        usuario = Usuario(nome=nome, email=email, senha_hash=hash_password(senha))
        sessao.add(usuario)
        acao = "Usuário criado"
    sessao.commit()
    print(f"\n{acao}: {email} / {senha}\n")
finally:
    sessao.close()
