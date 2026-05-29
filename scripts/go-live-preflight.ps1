param(
  [string]$Domain = "",
  [string]$AppUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message"
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-WarnLine {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-TcpPort {
  param(
    [string]$ComputerName,
    [int]$Port
  )

  try {
    $result = Test-NetConnection -ComputerName $ComputerName -Port $Port -WarningAction SilentlyContinue
    return [bool]$result.TcpTestSucceeded
  }
  catch {
    return $false
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$envFile = ""
if (Test-Path (Join-Path $repoRoot ".env")) {
  $envFile = Join-Path $repoRoot ".env"
}
elseif (Test-Path (Join-Path $repoRoot "env")) {
  $envFile = Join-Path $repoRoot "env"
}

if (-not $envFile) {
  Write-Fail "No .env/env file found in repository root."
  exit 1
}

Write-Info "Using environment file: $envFile"

if (Test-Command "node") {
  Write-Ok "node is available"
}
else {
  Write-Fail "node is missing"
  exit 1
}

if (Test-Command "npm") {
  Write-Ok "npm is available"
}
else {
  Write-Fail "npm is missing"
  exit 1
}

if (Test-Command "pm2") {
  Write-Ok "pm2 is available"
}
else {
  Write-WarnLine "pm2 is missing from PATH (deploy script has fallback path support)."
}

$requiredEnvVars = @(
  "NODE_ENV",
  "SERVER_PORT",
  "ALLOWED_ORIGINS",
  "JWT_SECRET",
  "SESSION_SECRET",
  "CHECKSUM_SECRET_KEY",
  "DB_NAME",
  "DB_HOST",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_PORT"
)

$envData = Get-Content $envFile
$missingVars = @()

foreach ($varName in $requiredEnvVars) {
  $match = $envData | Where-Object { $_ -match "^$varName=" } | Select-Object -First 1
  if (-not $match) {
    $missingVars += $varName
    continue
  }

  $value = ($match -split "=", 2)[1]
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missingVars += $varName
  }
}

if ($missingVars.Count -gt 0) {
  Write-Fail "Missing required env vars: $($missingVars -join ', ')"
  exit 1
}

Write-Ok "Required env vars found"

$nodeEnvLine = $envData | Where-Object { $_ -match "^NODE_ENV=" } | Select-Object -First 1
$nodeEnvValue = ($nodeEnvLine -split "=", 2)[1]
if ($nodeEnvValue -ne "production") {
  Write-WarnLine "NODE_ENV is '$nodeEnvValue' (expected 'production' for live)."
}
else {
  Write-Ok "NODE_ENV is production"
}

$allowedOriginsLine = $envData | Where-Object { $_ -match "^ALLOWED_ORIGINS=" } | Select-Object -First 1
$allowedOriginsValue = ($allowedOriginsLine -split "=", 2)[1]

if ($allowedOriginsValue -match "http://") {
  Write-WarnLine "ALLOWED_ORIGINS contains http:// entries; use https:// for live."
}

if ($allowedOriginsValue -match "/$") {
  Write-WarnLine "ALLOWED_ORIGINS has trailing slash; remove trailing '/' to match CORS origin exactly."
}

if (Test-TcpPort -ComputerName "localhost" -Port 3306) {
  Write-Ok "MySQL/MariaDB reachable on localhost:3306"
}
else {
  Write-Fail "MySQL/MariaDB not reachable on localhost:3306"
  exit 1
}

if (Test-TcpPort -ComputerName "127.0.0.1" -Port 6379) {
  Write-Ok "Redis reachable on 127.0.0.1:6379"
}
else {
  Write-WarnLine "Redis not reachable on 127.0.0.1:6379 (required for full live behavior)."
}

try {
  $dbCheckOutput = node -e "require('./server/config/loadEnv'); const mysql=require('mysql2/promise'); (async()=>{ const c=await mysql.createConnection({host:process.env.DB_HOST, port:Number(process.env.DB_PORT||3306), user:process.env.DB_USERNAME, password:process.env.DB_PASSWORD, database:process.env.DB_NAME}); const [r]=await c.query('SELECT COUNT(*) AS c FROM raffles'); console.log('DB_OK raffles=' + r[0].c); await c.end(); })().catch(e=>{ console.error('DB_ERR ' + e.message); process.exit(1); });"
  Write-Ok ($dbCheckOutput | Out-String).Trim()
}
catch {
  Write-Fail "Database query test failed: $($_.Exception.Message)"
  exit 1
}

if (Test-Path (Join-Path $repoRoot "build\index.html")) {
  Write-Ok "Frontend build artifact exists (build/index.html)"
}
else {
  Write-WarnLine "No build artifact found. Run: npm run build:prod"
}

try {
  $status = Invoke-WebRequest -Uri $AppUrl -UseBasicParsing -TimeoutSec 15
  if ($status.StatusCode -eq 200) {
    Write-Ok "App root responds: $AppUrl"
  }
  else {
    Write-WarnLine "App root returned status: $($status.StatusCode)"
  }
}
catch {
  Write-Fail "App root check failed for ${AppUrl}: $($_.Exception.Message)"
  exit 1
}

try {
  $apiStatus = Invoke-WebRequest -Uri "$AppUrl/api/raffle/live" -UseBasicParsing -TimeoutSec 20
  if ($apiStatus.StatusCode -eq 200) {
    Write-Ok "API check passed: /api/raffle/live"
  }
  else {
    Write-WarnLine "API check returned status: $($apiStatus.StatusCode)"
  }
}
catch {
  Write-Fail "API check failed: $($_.Exception.Message)"
  exit 1
}

if ($Domain) {
  Write-Info "Checking DNS resolution for domain: $Domain"
  try {
    $dns = Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop
    $ips = $dns | Select-Object -ExpandProperty IPAddress -ErrorAction SilentlyContinue
    if ($ips) {
      Write-Ok "Domain resolves to: $($ips -join ', ')"
    }
    else {
      Write-WarnLine "Domain resolved but no A records were returned."
    }
  }
  catch {
    Write-WarnLine "DNS check failed for ${Domain}: $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Ok "Preflight completed."