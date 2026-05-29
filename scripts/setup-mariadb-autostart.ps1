param(
  [string]$MariaDbBin = "C:\\Program Files\\MariaDB 12.2\\bin\\mariadbd.exe",
  [string]$MyIniPath = "C:\\Program Files\\MariaDB 12.2\\data\\my.ini"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MariaDbBin)) {
  throw "MariaDB binary not found: $MariaDbBin"
}

if (-not (Test-Path $MyIniPath)) {
  throw "MariaDB config not found: $MyIniPath"
}

$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$launcherPath = Join-Path $startupDir "start-mariadb-foxclub.bat"

$launcherContent = @"
@echo off
setlocal

tasklist /FI "IMAGENAME eq mariadbd.exe" | find /I "mariadbd.exe" >NUL
if %ERRORLEVEL%==0 exit /b 0

start "MariaDB FoxClub" "$MariaDbBin" --defaults-file="$MyIniPath" --console
exit /b 0
"@

Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII

Write-Host "Startup launcher written: $launcherPath"
Write-Host "MariaDB bin: $MariaDbBin"
Write-Host "my.ini: $MyIniPath"