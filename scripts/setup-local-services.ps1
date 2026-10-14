<#
.SYNOPSIS
  下载并初始化本项目所需的本地依赖服务（免安装、无需管理员权限）。

.DESCRIPTION
  - PostgreSQL：下载 EnterpriseDB 官方 Windows 二进制包，解压后 initdb 初始化数据目录并建库
  - Meilisearch：下载官方单文件 exe
  所有文件都放在仓库下的 .local 目录（已加入 .gitignore），删除该目录即可完全卸载。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup-local-services.ps1
  powershell -ExecutionPolicy Bypass -File scripts/setup-local-services.ps1 -Force   # 重新下载
#>
param(
  [string]$Root = (Join-Path $PSScriptRoot '..\.local'),
  [string]$DbUser = 'luotianyi',
  [string]$DbPassword = 'luotianyi',
  [string]$DbName = 'luotianyi_wiki',
  [int]$PgPort = 5432,
  [string]$MeiliMasterKey = 'luotianyi_dev_master_key',
  [switch]$Force
)

# 注意：不能用 Stop。PowerShell 5.1 在 Stop 模式下会把原生命令写到 stderr 的内容
# 当成终止性错误（NativeCommandError），导致 pg_ctl / psql 正常输出也会中断脚本。
# 这里改为 Continue，并对需要中断的情况显式 throw。
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$PgCandidates = @(
  'https://get.enterprisedb.com/postgresql/postgresql-16.4-1-windows-x64-binaries.zip',
  'https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip',
  'https://get.enterprisedb.com/postgresql/postgresql-17.2-1-windows-x64-binaries.zip',
  'https://get.enterprisedb.com/postgresql/postgresql-15.12-1-windows-x64-binaries.zip'
)
$MeiliUrl = 'https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-windows-amd64.exe'

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-File([string]$Url, [string]$Destination) {
  Write-Host "    下载 $Url"
  try {
    Start-BitsTransfer -Source $Url -Destination $Destination -ErrorAction Stop
  } catch {
    Write-Host "    BITS 不可用，回退到 Invoke-WebRequest"
    Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
  }
}

# ---------------------------------------------------------------- 目录准备
Write-Step "准备目录 $Root"
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$pgHome = Join-Path $Root 'pgsql'
$pgData = Join-Path $Root 'pgdata'
$meiliHome = Join-Path $Root 'meilisearch'
$meiliData = Join-Path $meiliHome 'data'
New-Item -ItemType Directory -Force -Path $meiliHome, $meiliData | Out-Null

# ---------------------------------------------------------------- PostgreSQL
if ($Force -and (Test-Path $pgHome)) {
  Write-Host '    移除旧的 PostgreSQL 目录'
  Remove-Item -Recurse -Force $pgHome
}

if (-not (Test-Path (Join-Path $pgHome 'bin\postgres.exe'))) {
  Write-Step '下载 PostgreSQL 二进制包（约 300MB，请耐心等待）'
  $zipPath = Join-Path $Root 'pgsql-binaries.zip'
  $downloaded = $false

  foreach ($url in $PgCandidates) {
    try {
      Get-File -Url $url -Destination $zipPath
      $downloaded = $true
      Write-Host "    下载完成：$url" -ForegroundColor Green
      break
    } catch {
      Write-Host "    失败，尝试下一个地址：$($_.Exception.Message)" -ForegroundColor Yellow
    }
  }

  if (-not $downloaded) {
    throw '所有 PostgreSQL 下载地址均失败，请检查网络或代理设置。'
  }

  Write-Step '解压 PostgreSQL'
  if (Test-Path $pgHome) { Remove-Item -Recurse -Force $pgHome }
  Expand-Archive -Path $zipPath -DestinationPath $Root -Force
  Remove-Item -Force $zipPath
} else {
  Write-Step 'PostgreSQL 已存在，跳过下载'
}

$initdb = Join-Path $pgHome 'bin\initdb.exe'
$pgCtl = Join-Path $pgHome 'bin\pg_ctl.exe'
$createdb = Join-Path $pgHome 'bin\createdb.exe'

Write-Step '初始化数据库集群（超级用户与端口在脚本参数中）'
if (Test-Path (Join-Path $pgData 'PG_VERSION')) {
  Write-Host '    数据库集群已初始化，跳过 initdb' -ForegroundColor Green
} else {
  Write-Host "    initdb -U $DbUser --auth=trust --encoding=UTF8 --locale=C"
  & $initdb -D $pgData -U $DbUser --auth=trust --encoding=UTF8 --locale=C 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'initdb 执行失败，请检查 .local/pgdata 是否可写' }
}

Write-Step '启动 PostgreSQL'
$pgStatus = (& $pgCtl -D $pgData status 2>&1 | Out-String)
if ($pgStatus -match 'server is running') {
  Write-Host "    已在运行（端口 $PgPort）" -ForegroundColor Green
} else {
  & $pgCtl -D $pgData -l (Join-Path $pgData 'server.log') -o "-p $PgPort" start 2>&1 | Out-Host
  Start-Sleep -Seconds 3
  Write-Host "    已启动（端口 $PgPort）" -ForegroundColor Green
}

Write-Step "确认数据库 $DbName 存在"
$psql = Join-Path $pgHome 'bin\psql.exe'
$dbExists = (& $psql -h 127.0.0.1 -p $PgPort -U $DbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName'" 2>&1 | Out-String).Trim()

if ($dbExists -ne '1') {
  & $createdb -h 127.0.0.1 -p $PgPort -U $DbUser $DbName 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "创建数据库 $DbName 失败" }
  Write-Host "    已创建数据库 $DbName" -ForegroundColor Green
} else {
  Write-Host "    数据库 $DbName 已存在" -ForegroundColor Green
}

# ---------------------------------------------------------------- Meilisearch
$meiliExe = Join-Path $meiliHome 'meilisearch.exe'
if ($Force -or -not (Test-Path $meiliExe)) {
  Write-Step '下载 Meilisearch（约 100MB）'
  Get-File -Url $MeiliUrl -Destination $meiliExe
  Write-Host '    Meilisearch 下载完成' -ForegroundColor Green
} else {
  Write-Step 'Meilisearch 已存在，跳过下载'
}

# ---------------------------------------------------------------- 完成
Write-Step '本地服务准备完成'
Write-Host "  PostgreSQL  : 127.0.0.1:$PgPort  用户 $DbUser / 密码 $DbPassword  库 $DbName" -ForegroundColor Green
Write-Host "  Meilisearch : http://127.0.0.1:7700  Master Key $MeiliMasterKey" -ForegroundColor Green
Write-Host ''
Write-Host '  下一步：'
Write-Host '    powershell -ExecutionPolicy Bypass -File scripts/start-local-services.ps1'
Write-Host '    pnpm seed'
Write-Host '    pnpm dev'
