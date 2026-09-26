"""
Diagnóstico do ambiente LOCAL: testa, etapa por etapa, o caminho do login.

Uso, na raiz do projeto (com backend e frontend rodando):
    .\\venv\\Scripts\\python.exe scripts\\diagnostico_local.py
    .\\venv\\Scripts\\python.exe scripts\\diagnostico_local.py email@x.com senha

Sem argumentos testa admin@nuncafilmes.com / admin123. Não altera nada.
"""
import os
import subprocess
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
os.chdir(RAIZ)

EMAIL = sys.argv[1] if len(sys.argv) > 1 else "admin@nuncafilmes.com"
SENHA = sys.argv[2] if len(sys.argv) > 2 else "admin123"


def ok(msg):
    print(f"  [OK]   {msg}")


def erro(msg):
    print(f"  [ERRO] {msg}")


def secao(titulo):
    print(f"\n== {titulo} ==")


# 1. Código ------------------------------------------------------------------
secao("1. Codigo local (git)")
try:
    branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
    commit = subprocess.run(["git", "log", "--oneline", "-1"], capture_output=True, text=True).stdout.strip()
    subprocess.run(["git", "fetch", "-q", "origin", branch], capture_output=True)
    atras = subprocess.run(["git", "rev-list", "--count", f"HEAD..origin/{branch}"], capture_output=True, text=True).stdout.strip()
    print(f"  branch: {branch}\n  ultimo commit: {commit}")
    if not branch:
        erro("pasta nao e um repositorio git (ou git indisponivel)")
    elif atras and atras != "0":
        erro(f"codigo local esta {atras} commit(s) atras do GitHub -> rode: git pull")
    else:
        ok("codigo atualizado com o GitHub")
except FileNotFoundError:
    erro("git nao encontrado no PATH")

# 2. .env --------------------------------------------------------------------
secao("2. Arquivo .env")
load_dotenv(RAIZ / ".env")
url = os.getenv("DATABASE_URL") or ""
if not url:
    erro("DATABASE_URL nao encontrada no .env")
    sys.exit(1)
mascarada = url.split("://")[0] + "://***@" + url.split("@")[-1] if "@" in url else url
ok(f"DATABASE_URL = {mascarada}")
load_dotenv(RAIZ / ".env.google.local")
chave = os.getenv("GOOGLE_MAPS_API_KEY") or ""
(ok if chave and not chave.startswith("COLE_AQUI") else erro)(
    "GOOGLE_MAPS_API_KEY " + ("configurada" if chave and not chave.startswith("COLE_AQUI") else "NAO configurada em .env.google.local")
)

# 3. Banco e senha -----------------------------------------------------------
secao("3. Banco de dados e senha")
try:
    from sqlalchemy import create_engine, inspect, text
    from app.core.security import verify_password

    engine = create_engine(url, connect_args={"connect_timeout": 5} if url.startswith("postgres") else {})
    with engine.connect() as c:
        ok(f"conectado ao banco '{engine.url.database}'")
        tabelas = inspect(engine).get_table_names()
        faltando = {"usuarios", "clientes", "servicos"} - set(tabelas)
        (erro if faltando else ok)(f"tabelas: {len(tabelas)} encontradas" + (f", faltando {faltando}" if faltando else ""))
        usuarios = c.execute(text("select id, email, senha_hash from usuarios order by id")).fetchall()
        print("  usuarios na base:")
        for uid, email, _ in usuarios:
            print(f"    #{uid} {email!r}")
        alvo = [u for u in usuarios if u[1] == EMAIL]
        if not alvo:
            parecidos = [u[1] for u in usuarios if u[1].strip().lower() == EMAIL.lower()]
            erro(f"nenhum usuario com email exatamente {EMAIL!r}" + (f" (existe {parecidos[0]!r}: espacos/maiusculas?)" if parecidos else ""))
        else:
            h = alvo[0][2] or ""
            if not h.startswith("$2"):
                erro(f"senha_hash de {EMAIL} nao e bcrypt (comeca com {h[:4]!r}) - foi gravada em texto?")
            elif verify_password(SENHA, h):
                ok(f"senha confere para {EMAIL}")
            else:
                erro(f"senha NAO confere com o hash gravado para {EMAIL}")
except Exception as e:
    erro(f"{type(e).__name__}: {e}")

# 4. Backend -----------------------------------------------------------------
secao("4. Backend (http://127.0.0.1:8000)")
try:
    r = requests.get("http://127.0.0.1:8000/", timeout=5)
    ok(f"backend respondeu: {r.status_code}")
    r = requests.post("http://127.0.0.1:8000/auth/login", json={"email": EMAIL, "senha": SENHA}, timeout=10)
    (ok if r.ok else erro)(f"login direto no backend: HTTP {r.status_code} {'' if r.ok else r.text[:200]}")
except requests.RequestException as e:
    erro(f"backend nao respondeu ({type(e).__name__}) - ele esta rodando? veja a janela do START_BACK_LOCAL.bat")

# 5. Frontend (proxy do Vite) ------------------------------------------------
secao("5. Frontend (http://localhost:5173/api -> backend)")
try:
    r = requests.post("http://localhost:5173/api/auth/login", json={"email": EMAIL, "senha": SENHA}, timeout=10)
    (ok if r.ok else erro)(f"login pelo proxy do frontend: HTTP {r.status_code} {'' if r.ok else r.text[:200]}")
except requests.RequestException as e:
    erro(f"frontend nao respondeu ({type(e).__name__}) - o npm run dev esta rodando?")

print()
