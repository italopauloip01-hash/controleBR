@echo off
setlocal enabledelayedexpansion

set "JBR=C:\Program Files\Android\Android Studio\jbr"
set "ADB=C:\Users\italo\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "GRADLEW=%~dp0android\gradlew.bat"

echo ============================================
echo  Parando daemons antigos do Gradle...
echo ============================================
cd android
"%JBR%\bin\java.exe" -jar ..\node_modules\@capacitor\cli\bin\capacitor 2>nul
"%GRADLEW%" --stop 2>nul
cd ..

echo.
echo ============================================
echo  Compilando APK (modo debug)...
echo ============================================
cd android
call "%GRADLEW%" assembleDebug "-Dorg.gradle.java.home=%JBR%"
set BUILD_RESULT=%ERRORLEVEL%
cd ..

if %BUILD_RESULT% NEQ 0 (
    echo.
    echo === BUILD FALHOU! ===
    exit /b %BUILD_RESULT%
)

echo.
echo ============================================
echo  Build OK! Verificando dispositivos...
echo ============================================
"%ADB%" devices

echo.
echo Instalando APK...
"%ADB%" install -r "android\app\build\outputs\apk\debug\app-debug.apk"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo INSTALACAO FALHOU. Emulador esta rodando?
    exit /b 1
)

echo.
echo Iniciando app...
"%ADB%" shell am start -n com.controlefinanceiro.app/.MainActivity

echo.
echo === PRONTO! App instalado e iniciado! ===
endlocal
