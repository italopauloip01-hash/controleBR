@echo off
title Sincronizando com Android Studio...
cd /d "%~dp0"
powershell -NoExit -ExecutionPolicy Bypass -File ".\integrar-android.ps1"
echo.
echo Pressione qualquer tecla para fechar...
pause > nul
