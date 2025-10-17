@echo off
cd /d "%~dp0"
echo ===============================================
echo Iniciando FRONTEND em modo REMOTO (devremote)
echo ===============================================
call npm run dev -- --mode devremote

pause
