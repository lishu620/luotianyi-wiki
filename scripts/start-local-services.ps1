<#
.SYNOPSIS
  启动 .local 目录下的 PostgreSQL 与 Meilisearch。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/start-local-services.ps1
#>
param(
  [string]$Root = (Join-Path $PSScriptRoot '..\.local'),
  [int]$PgPort = 5432,
  [int]$MeiliPort = 7700,
  [string]$MeiliMasterKey = 'luotianyi_dev_master_key'
)

# 见 setup-local-services.ps1 中的说明：原生命令仍照常输出，不因 stderr 中断
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$pgData = Join-Path $Root 'pgdata'
$pgCtl = Join-Path $Root 'pgsql\bin\pg_ctl.exe'
$meiliExe = Join-Path $Root 'meilisearch\meilisearch.exe'
$meiliData = Join-Path $Root 'meilisearch\data'

if (-not (Test-Path $pgCtl)) {
  throw "未找到 PostgreSQL，请先执行 scripts/setup-local-services.ps1"
}

Write-Host '==> 启动 PostgreSQL' -ForegroundColor Cyan
$pgStatus = (& $pgCtl -D $pgData status 2>&1 | Out-String)
if ($pgStatus -match 'server is running') {
  Write-Host "    已在运行（端口 $PgPort）" -ForegroundColor Green
} else {
  & $pgCtl -D $pgData -l (Join-Path $pgData 'server.log') -o "-p $PgPort" start 2>&1 | Out-Host
  Write-Host "    已启动（端口 $PgPort，日志 .local\pgdata\server.log）" -ForegroundColor Green
}

Write-Host '==> 启动 Meilisearch' -ForegroundColor Cyan
$meiliListening = Get-NetTCPConnection -State Listen -LocalPort $MeiliPort -ErrorAction SilentlyContinue
if ($meiliListening) {
  Write-Host "    已在运行（端口 $MeiliPort）" -ForegroundColor Green
} else {
  if (-not (Test-Path $meiliExe)) {
    throw '未找到 Meilisearch，请先执行 scripts/setup-local-services.ps1'
  }

  Start-Process -FilePath $meiliExe `
    -ArgumentList '--db-path', "`"$meiliData`"", '--http-addr', "127.0.0.1:$MeiliPort", '--master-key', $MeiliMasterKey, '--no-analytics' `
    -WorkingDirectory (Split-Path $meiliExe) `
    -WindowStyle Hidden

  Start-Sleep -Seconds 2
  Write-Host "    已启动（http://127.0.0.1:$MeiliPort）" -ForegroundColor Green
}

Write-Host ''
Write-Host '服务已就绪，接下来可以执行：pnpm seed 和 pnpm dev' -ForegroundColor Green
