@echo off
cd /d "%~dp0"
echo ===============================================
echo Iniciando FRONTEND em modo LOCAL (devlocal)
echo Backend: http://localhost:8000
echo ===============================================
call npm run dev
pause
