# Script de Integração Android - controle-financeiro
# Detecta automaticamente o JDK correto e força o JAVA_HOME

$ErrorActionPreference = "Stop"
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SINCRONIZANDO COM ANDROID STUDIO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# -------------------------------------------------------
# PASSO -1: Limpeza Total de Variáveis e Processos (Anti-Leaks)
# -------------------------------------------------------
Write-Host "-1/7 Limpando ambiente e processos Java..." -ForegroundColor Yellow
$env:JAVA_HOME = $null
$env:JDK_HOME = $null
$env:JAVA_TOOL_OPTIONS = $null
$env:_JAVA_OPTIONS = $null

# Mata processos Java que podem ser Daemons zumbis com o JDK errado
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# -------------------------------------------------------
# PASSO 0: Detectar e forçar o JDK correto (Android Studio JBR)
# -------------------------------------------------------
Write-Host "0/7 Detectando JDK do Android Studio..." -ForegroundColor Yellow

$possiveisCaminhos = @(
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Android\Android Studio\jre",
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr",
    "$env:LOCALAPPDATA\Programs\Android Studio\jre"
)

$jdkEncontrado = $null
foreach ($caminho in $possiveisCaminhos) {
    if (Test-Path "$caminho\bin\java.exe") {
        $jdkEncontrado = $caminho
        break
    }
}

if ($jdkEncontrado) {
    # LIMPEZA CRUCIAL: Remove caminhos de extensao E forca as variaveis
    $pathOriginal = $env:PATH -split ";" | Where-Object { $_ -notmatch "\.antigravity" -and $_ -notmatch "redhat\.java" -and $_ -notmatch "java" }
    $env:PATH = "$jdkEncontrado\bin;" + ($pathOriginal -join ";")
    
    $env:JAVA_HOME = $jdkEncontrado
    $env:JDK_HOME = $jdkEncontrado
    Write-Host "   ✅ JAVA_HOME forcado para: $jdkEncontrado" -ForegroundColor Green
    Write-Host "   ✅ PATH limpo de JAVA externo." -ForegroundColor Green

    # Atualiza o gradle.properties dinamicamente (Usa barras normais /)
    $gradlePropsPath = "android\gradle.properties"
    if (Test-Path $gradlePropsPath) {
        $jdkPathClean = $jdkEncontrado.Replace('\', '/')
        $content = Get-Content $gradlePropsPath
        $newContent = @()
        foreach ($line in $content) {
            if ($line -notmatch "org.gradle.java.home" -and $line -notmatch "auto-detect" -and $line -notmatch "auto-download") {
                $newContent += $line
            }
        }
        $newContent += "org.gradle.java.home=$jdkPathClean"
        $newContent += "org.gradle.java.installations.auto-detect=false"
        $newContent += "org.gradle.java.installations.auto-download=false"
        $newContent += "org.gradle.java.installations.from-env=false"
        $newContent | Out-File -FilePath $gradlePropsPath -Encoding utf8 -Force
        Write-Host "   ✅ Gradle isolado para o JDK do Android Studio." -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Android Studio JBR nao encontrado nos caminhos padrao." -ForegroundColor Red
    Write-Host "   Tentando JAVA_HOME atual: $env:JAVA_HOME" -ForegroundColor Yellow
    # Tentar buscar em todo o disco (lento, mas garante encontrar)
    $found = Get-ChildItem "C:\Program Files\Android\" -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $jdkEncontrado = $found.DirectoryName -replace "\\bin$",""
        $env:JAVA_HOME = $jdkEncontrado
        $env:PATH = "$jdkEncontrado\bin;" + $env:PATH
        Write-Host "   ✅ JDK encontrado em: $jdkEncontrado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ ERRO: Nenhum JDK do Android Studio encontrado. Instale o Android Studio." -ForegroundColor Red
        Pause
        exit 1
    }
}

# Confirma versao do Java em uso
try {
    $javaVer = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Select-Object -First 1
    Write-Host "   Java em uso: $javaVer`n" -ForegroundColor Cyan
} catch {
    Write-Host "   Java configurado em: $env:JAVA_HOME`n" -ForegroundColor Cyan
}

# -------------------------------------------------------
# PASSO 1: Fechar processos Java anteriores
# -------------------------------------------------------
Write-Host "1/7 Parando processos Java..." -ForegroundColor Yellow
Get-Process -Name "java" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# -------------------------------------------------------
# PASSO 2: Limpeza profunda
# -------------------------------------------------------
Write-Host "2/7 Apagando dist e builds antigos..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Path "dist" -Recurse -Force }
if (Test-Path "android\app\build") { Remove-Item -Path "android\app\build" -Recurse -Force }

# -------------------------------------------------------
# PASSO 3: Build Web
# -------------------------------------------------------
Write-Host "3/7 Gerando Build Web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO no build web!" -ForegroundColor Red
    Pause
    exit 1
}

# Arquivo de prova
New-Item -Path "dist\RECONSTRUCAO.txt" -Value (Get-Date).ToString() -Force | Out-Null

# -------------------------------------------------------
# PASSO 4: Sincronizar Capacitor
# -------------------------------------------------------
Write-Host "4/7 Sincronizando Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO na sincronizacao do Capacitor!" -ForegroundColor Red
    Pause
    exit 1
}

# -------------------------------------------------------
# PASSO 5: Validar sincronização
# -------------------------------------------------------
if (Test-Path "android\app\src\main\assets\public\RECONSTRUCAO.txt") {
    Write-Host "5/7 ✅ Arquivos sincronizados com sucesso no Android!" -ForegroundColor Green
} else {
    Write-Host "5/7 ❌ ERRO: Arquivos NAO chegaram na pasta Android!" -ForegroundColor Red
}

# -------------------------------------------------------
# PASSO 6: Gradle Clean (Resetando Daemons e Cache)
# -------------------------------------------------------
Write-Host "6/7 Parando Daemons e Limpando Gradle..." -ForegroundColor Yellow
Set-Location android

# Para qualquer Daemon que esteja usando o JDK errado
.\gradlew --stop "-Dorg.gradle.java.home=$env:JAVA_HOME"

# Roda o clean sem Daemon para garantir um ambiente limpo
.\gradlew clean --no-daemon "-Dorg.gradle.java.home=$env:JAVA_HOME"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERRO na limpeza do Gradle! O processo parou." -ForegroundColor Red
    Set-Location ..
    Pause
    exit 1
}
Set-Location ..

# -------------------------------------------------------
# PASSO 7: Abrir Android Studio
# -------------------------------------------------------
Write-Host "7/7 Abrindo Android Studio..." -ForegroundColor Yellow
npx cap open android

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ SINCRONIZACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "JDK utilizado: $env:JAVA_HOME"
Pause
