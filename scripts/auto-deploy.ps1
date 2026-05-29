param(
  [string]$AppName = "foxclub-raffle",
  [switch]$SkipInstall,
  [switch]$SkipMigrations,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param([string]$Message)
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp] $Message"
}

function Invoke-Step {
  param(
    [string]$Description,
    [scriptblock]$Action
  )

  Write-Log $Description
  & $Action
}

function Resolve-Executable {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string[]]$Fallbacks = @()
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  foreach ($fallback in $Fallbacks) {
    if (Test-Path $fallback) {
      return $fallback
    }
  }

  throw "Required executable '$Name' was not found in PATH or fallback locations."
}

try {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  Set-Location $repoRoot

  $gitExe = Resolve-Executable -Name "git" -Fallbacks @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
  )
  $npmExe = Resolve-Executable -Name "npm" -Fallbacks @(
    "$env:ProgramFiles\nodejs\npm.cmd",
    "$env:ProgramFiles\nodejs\npm.exe"
  )
  $pm2Exe = Resolve-Executable -Name "pm2" -Fallbacks @(
    "$env:APPDATA\npm\pm2.cmd"
  )

  Invoke-Step "Checking Git repository state" {
    $null = & $gitExe rev-parse --is-inside-work-tree 2>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Current directory is not a Git repository: $repoRoot"
    }
  }

  $hasLocalChanges = (& $gitExe status --porcelain)
  if ($hasLocalChanges) {
    Write-Log "Skipped deploy: working tree has local changes. Commit/stash first."
    exit 0
  }

  Invoke-Step "Fetching latest changes from origin" {
    & $gitExe fetch --prune origin
    if ($LASTEXITCODE -ne 0) {
      throw "git fetch failed"
    }
  }

  $localHead = (& $gitExe rev-parse HEAD).Trim()
  $upstreamHead = (& $gitExe rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null).Trim()

  if (-not $upstreamHead) {
    throw "No upstream branch is configured for current branch."
  }

  $remoteHead = (& $gitExe rev-parse $upstreamHead).Trim()
  $mergeBase = (& $gitExe merge-base HEAD $upstreamHead).Trim()

  if ($localHead -eq $remoteHead) {
    Write-Log "No update found. Already on latest commit."
    exit 0
  }

  if ($localHead -ne $mergeBase) {
    Write-Log "Skipped deploy: local branch has commits not on upstream (diverged/ahead)."
    exit 0
  }

  $oldHead = $localHead

  Invoke-Step "Pulling latest commit (fast-forward only)" {
    & $gitExe pull --ff-only
    if ($LASTEXITCODE -ne 0) {
      throw "git pull --ff-only failed"
    }
  }

  $changedFiles = & $gitExe diff --name-only $oldHead HEAD
  $packageFilesChanged = $changedFiles | Where-Object {
    $_ -in @("package.json", "package-lock.json")
  }

  if (-not $SkipInstall -and $packageFilesChanged) {
    Invoke-Step "Installing npm dependencies (ignore scripts for Windows compatibility)" {
      & $npmExe install --ignore-scripts
      if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
      }
    }
  } else {
    Write-Log "Dependency install skipped (no package file changes or SkipInstall enabled)."
  }

  if (-not $SkipMigrations) {
    Invoke-Step "Running production migrations" {
      & $npmExe run migrate:prod
      if ($LASTEXITCODE -ne 0) {
        throw "Database migration failed"
      }
    }
  } else {
    Write-Log "Migration step skipped."
  }

  if (-not $SkipBuild) {
    Invoke-Step "Building production frontend bundle" {
      & $npmExe run build:prod
      if ($LASTEXITCODE -ne 0) {
        throw "Production build failed"
      }
    }
  } else {
    Write-Log "Build step skipped."
  }

  $pm2ProcessExists = $false
  & $pm2Exe describe $AppName *> $null
  if ($LASTEXITCODE -eq 0) {
    $pm2ProcessExists = $true
  }

  if ($pm2ProcessExists) {
    Invoke-Step "Restarting PM2 app '$AppName'" {
      & $pm2Exe restart $AppName
      if ($LASTEXITCODE -ne 0) {
        throw "PM2 restart failed"
      }
    }
  } else {
    Invoke-Step "Starting PM2 app '$AppName'" {
      & $pm2Exe start ecosystem.config.cjs --env production
      if ($LASTEXITCODE -ne 0) {
        throw "PM2 start failed"
      }
    }
  }

  Invoke-Step "Saving PM2 process list" {
    & $pm2Exe save
    if ($LASTEXITCODE -ne 0) {
      throw "PM2 save failed"
    }
  }

  Write-Log "Auto-deploy complete. Running commit: $(& $gitExe rev-parse --short HEAD)"
}
catch {
  Write-Error "Auto-deploy failed: $($_.Exception.Message)"
  exit 1
}
