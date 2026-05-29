param(
  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [string]$OutputPath = "C:\\caddy\\Caddyfile"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$templatePath = Join-Path $repoRoot "deploy\Caddyfile.template"

if (-not (Test-Path $templatePath)) {
  throw "Template not found: $templatePath"
}

$template = Get-Content $templatePath -Raw
$content = $template.Replace('{$DOMAIN}', $Domain)

$outputDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path $outputDir)) {
  New-Item -Path $outputDir -ItemType Directory -Force | Out-Null
}

Set-Content -Path $OutputPath -Value $content -Encoding ASCII

Write-Host "Caddy config written: $OutputPath"
Write-Host "Domain: $Domain"