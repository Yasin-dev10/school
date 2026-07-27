# School Registry — Android release keystore setup + build
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File mobile/scripts/setup-release.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Resolve-Path (Join-Path $scriptDir "..")
$androidDir = Join-Path $mobileDir "android"
$appDir = Join-Path $androidDir "app"
$keystorePath = Join-Path $appDir "upload-keystore.jks"
$keyPropsPath = Join-Path $androidDir "key.properties"

function Find-Keytool {
    $candidates = @()
    if ($env:JAVA_HOME) {
        $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe")
    }
    $candidates += @(
        "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
        "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe",
        "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr\bin\keytool.exe"
    )
    Get-ChildItem "C:\Program Files\Java" -Filter "keytool.exe" -Recurse -ErrorAction SilentlyContinue -Depth 4 |
        ForEach-Object { $candidates += $_.FullName }
    Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Filter "keytool.exe" -Recurse -ErrorAction SilentlyContinue -Depth 4 |
        ForEach-Object { $candidates += $_.FullName }

    foreach ($c in ($candidates | Select-Object -Unique)) {
        if ($c -and (Test-Path $c)) { return $c }
    }
    return $null
}

function Find-Flutter {
    $cmd = Get-Command flutter -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $paths = @(
        "$env:USERPROFILE\flutter\bin\flutter.bat",
        "$env:USERPROFILE\develop\flutter\bin\flutter.bat",
        "C:\flutter\bin\flutter.bat",
        "C:\src\flutter\bin\flutter.bat",
        "$env:LOCALAPPDATA\flutter\bin\flutter.bat"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

Write-Host "==> School Registry release setup" -ForegroundColor Cyan
Write-Host "Mobile dir: $mobileDir"

$keytool = Find-Keytool
if (-not $keytool) {
    Write-Host "ERROR: keytool not found. Install Android Studio (JBR) or a JDK, then re-run." -ForegroundColor Red
    exit 1
}
Write-Host "keytool: $keytool"

if (-not (Test-Path $keyPropsPath)) {
    $pass = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    @"
storePassword=$pass
keyPassword=$pass
keyAlias=upload
storeFile=upload-keystore.jks
"@ | Set-Content -Path $keyPropsPath -Encoding ASCII
    Write-Host "Created android/key.properties (KEEP A BACKUP - never commit)" -ForegroundColor Yellow
} else {
    Write-Host "Using existing android/key.properties"
}

$props = @{}
Get-Content $keyPropsPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') { $props[$matches[1].Trim()] = $matches[2].Trim() }
}
$storePass = $props["storePassword"]
$keyPass = $props["keyPassword"]
$alias = $props["keyAlias"]
if (-not $storePass -or -not $keyPass -or -not $alias) {
    Write-Host "ERROR: key.properties is missing storePassword / keyPassword / keyAlias" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $keystorePath)) {
    Write-Host "Generating upload-keystore.jks ..."
    & $keytool -genkeypair -v `
        -keystore $keystorePath `
        -storetype JKS `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -alias $alias `
        -storepass $storePass `
        -keypass $keyPass `
        -dname "CN=School Registry, OU=Mobile, O=School Registry, L=Mogadishu, ST=Banaadir, C=SO"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Keystore created: $keystorePath" -ForegroundColor Green
} else {
    Write-Host "Keystore already exists: $keystorePath"
}

$flutter = Find-Flutter
if (-not $flutter) {
    Write-Host "WARNING: flutter not in PATH. Keystore is ready - run builds manually:" -ForegroundColor Yellow
    Write-Host "  cd mobile"
    Write-Host "  flutter build apk --release"
    Write-Host "  flutter build appbundle --release"
    exit 0
}

Write-Host "flutter: $flutter"
Set-Location $mobileDir
& $flutter pub get
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Building release APK..." -ForegroundColor Cyan
& $flutter build apk --release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Building Play Store App Bundle (.aab)..." -ForegroundColor Cyan
& $flutter build appbundle --release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "DONE. Artifacts:" -ForegroundColor Green
Write-Host "  APK:  $mobileDir\build\app\outputs\flutter-apk\app-release.apk"
Write-Host "  AAB:  $mobileDir\build\app\outputs\bundle\release\app-release.aab"
Write-Host ""
Write-Host "BACKUP these privately (never git commit):" -ForegroundColor Yellow
Write-Host "  $keystorePath"
Write-Host "  $keyPropsPath"
