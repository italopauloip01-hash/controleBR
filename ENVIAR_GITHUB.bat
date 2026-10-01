@echo off
title Enviando e Atualizando Versao do ControleBR...
echo ===================================================
echo     ATUALIZANDO VERSAO E ENVIANDO PARA O GITHUB
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Incrementando numero da versao...
node scripts/bump-version.js
echo.

echo [2/3] Criando commit com a nova versao...
git add -A
git commit -m "release: atualizacao automatica de versao"
echo.

echo [3/3] Enviando para o GitHub e Vercel...
git push origin main
echo.

if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo     SUCESSO! NOVA VERSAO ENVIADA E PUBLICADA!
    echo ===================================================
) else (
    echo ===================================================
    echo     OCORREU UM ERRO NO ENVIO. VERIFIQUE ACIMA.
    echo ===================================================
)
echo.
pause
