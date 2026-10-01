@echo off
title Enviando ControleBR para o GitHub...
echo ===================================================
echo     ENVIANDO O PROJETO CONTROLEBR PARA O GITHUB
echo ===================================================
echo.
cd /d "%~dp0"
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ===================================================
    echo     SUCESSO! O PROJETO FOI ENVIADO PARA O GITHUB!
    echo ===================================================
) else (
    echo ===================================================
    echo     OCORREU UM ERRO NO ENVIO. VERIFIQUE ACIMA.
    echo ===================================================
)
echo.
pause
