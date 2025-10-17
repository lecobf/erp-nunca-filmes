@echo off
cd /d "%~dp0"
echo ===============================================
echo Iniciando BACKEND em modo LOCAL
echo Banco de dados: F:\Dropbox\NUNCA_FILMES\PJ\erp\app\dados\nunca.db
echo Endpoint: http://127.0.0.1:8000
echo ===============================================

REM Ativa o ambiente virtual
call venv\Scripts\activate

REM Executa o servidor com reload automático
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
