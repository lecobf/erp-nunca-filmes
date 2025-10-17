@echo off
cd /d "%~dp0"
echo ===============================================
echo Iniciando BACKEND em modo REMOTO
echo Banco de dados: F:\Dropbox\NUNCA_FILMES\PJ\erp\app\dados\nunca.db
echo Endpoint: http://0.0.0.0:8000 (acessível pela internet)
echo ===============================================

REM Ativa o ambiente virtual
call venv\Scripts\activate

REM Executa o servidor acessível externamente
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
