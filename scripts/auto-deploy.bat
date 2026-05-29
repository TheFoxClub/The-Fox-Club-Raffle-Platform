@echo off
setlocal

set REPO_ROOT=%~dp0..
set LOG_FILE=%REPO_ROOT%\logs\auto-deploy.log

if not exist "%REPO_ROOT%\logs" mkdir "%REPO_ROOT%\logs"

echo [%date% %time%] Starting Fox Club auto-deploy >> "%LOG_FILE%"

powershell -ExecutionPolicy Bypass -NoProfile -File "%REPO_ROOT%\scripts\auto-deploy.ps1" >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo [%date% %time%] Auto-deploy failed with exit code %EXIT_CODE% >> "%LOG_FILE%"
) else (
  echo [%date% %time%] Auto-deploy finished successfully >> "%LOG_FILE%"
)

echo. >> "%LOG_FILE%"
exit /b %EXIT_CODE%
