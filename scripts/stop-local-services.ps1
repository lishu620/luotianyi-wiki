<#
.SYNOPSIS
  停止 .local 目录下的 PostgreSQL 与 Meilisearch。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/stop-local-services.ps1
#>
param(
  [string]$Root = (Join-Path $PSScriptRoot '..\.local'),
  [int]$MeiliPort = 7700
)

$ProgressPreference = 'SilentlyContinue'

$pgData = Join-Path $Root 'pgdata'
$pgCtl = Join-Path $Root 'pgsql\bin\pg_ctl.exe'

if (Test-Path $pgCtl) {
  Write-Host '==> 停止 PostgreSQL' -ForegroundColor Cyan
  & $pgCtl -D $pgData -m fast stop 2>&1 | Out-Host
}

Write-Host '==> 停止 Meilisearch' -ForegroundColor Cyan
$conn = Get-NetTCPConnection -State Listen -LocalPort $MeiliPort -ErrorAction SilentlyContinue
if ($conn) {
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Write-Host '    已停止' -ForegroundColor Green
} else {
  Write-Host '    未在运行' -ForegroundColor Yellow
}
