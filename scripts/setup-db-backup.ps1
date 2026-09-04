param(
  [string]$NodePath = "node",
  [string]$DumpBinary = "C:\Program Files\MariaDB 12.2\bin\mariadb-dump.exe",
  [string]$TaskName = "FoxClub Daily Database Backup",
  [string]$Time = "02:30"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command $NodePath -ErrorAction SilentlyContinue)) {
  throw "Node.js executable not found: $NodePath"
}

if (-not (Test-Path $DumpBinary)) {
  throw "MariaDB dump executable not found: $DumpBinary"
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$backupScript = Join-Path $PSScriptRoot "backup-db.js"
$resolvedNodePath = (Get-Command $NodePath -ErrorAction Stop).Source
$launcherPath = Join-Path $PSScriptRoot "run-db-backup.bat"
$launcherContent = @"
@echo off
setlocal
set "MARIADB_DUMP_BIN=$DumpBinary"
"$resolvedNodePath" "$backupScript"
exit /b %ERRORLEVEL%
"@
Set-Content -Path $launcherPath -Value $launcherContent -Encoding ASCII

$taskCommand = "$env:ComSpec /d /c $launcherPath"

schtasks /Create /F /SC DAILY /TN $TaskName /TR $taskCommand /ST $Time | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create scheduled task: $TaskName"
}

Write-Host "Daily database backup task created: $TaskName at $Time"
Write-Host "Backups are stored in: $(Join-Path $projectRoot 'backups\database')"