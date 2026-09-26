@echo off
cd /d "%~dp0"
REM ===============================================================
REM Cria os arquivos locais com as chaves do Google Maps e abre no
REM Bloco de Notas para preencher. Esses arquivos NAO vao para o git.
REM   nunca-frontend\.env.devlocal.local -> chave do navegador + Map ID
REM   .env.google.local                  -> chave do servidor (backend)
REM Se os arquivos ja existirem, apenas os abre (nada e sobrescrito).
REM ===============================================================

set "FRONT=nunca-frontend\.env.devlocal.local"
set "BACK=.env.google.local"

if not exist "%FRONT%" (
  > "%FRONT%" echo VITE_GOOGLE_MAPS_API_KEY=COLE_AQUI_A_CHAVE_DO_NAVEGADOR
  >> "%FRONT%" echo VITE_GOOGLE_MAPS_MAP_ID=COLE_AQUI_O_MAP_ID
  echo Criado: %FRONT%
)

if not exist "%BACK%" (
  > "%BACK%" echo GOOGLE_MAPS_API_KEY=COLE_AQUI_A_CHAVE_DO_SERVIDOR
  echo Criado: %BACK%
)

echo.
echo Substitua os textos COLE_AQUI_... pelos valores, salve (Ctrl+S) e feche.
echo Depois reinicie o backend e o frontend (npm run dev).
start "" notepad "%FRONT%"
start "" notepad "%BACK%"
pause
