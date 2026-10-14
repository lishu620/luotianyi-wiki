<#
.SYNOPSIS
  一键部署到远程服务器：本地构建 → 上传 → 重建镜像 → 重启 → 校验。

.DESCRIPTION
  服务器信息与密码保存在 .local/deploy/server.json（已加入 .gitignore）。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1
  powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1 -SkipBuild      # 复用上次的构建产物
  powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1 -OnlyVerify     # 只跑校验
#>
param(
  [string]$RemoteDir = '/home/mlishu/luotianyi-wiki',
  [string]$Domain = '192.168.31.106',
  [string]$Scheme = 'http',
  [switch]$SkipBuild,
  [switch]$SkipDump,
  [switch]$OnlyVerify
)

$ErrorActionPreference = 'Continue'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not $OnlyVerify) {
  Write-Step '1/3 组装部署包'
  $bundleArgs = @('-Domain', $Domain)
  if ($SkipBuild) { $bundleArgs += '-SkipBuild' }
  if ($SkipDump) { $bundleArgs += '-SkipDump' }
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-bundle.ps1') @bundleArgs
  if ($LASTEXITCODE -ne 0) { throw '组装部署包失败' }

  Write-Step '2/3 上传到服务器'
  & py (Join-Path $PSScriptRoot 'upload-bundle.py') --remote-dir $RemoteDir
  if ($LASTEXITCODE -ne 0) { throw '上传失败' }

  Write-Step '3/3 重建镜像并重启服务'
  & py (Join-Path $PSScriptRoot 'remote.py') run "cd $RemoteDir && docker compose build 2>&1 | tail -5 && docker compose up -d 2>&1 | tail -12 && sleep 20 && docker compose ps --format 'table {{.Name}}\t{{.Status}}'"
  if ($LASTEXITCODE -ne 0) { throw '服务重启失败' }
}

Write-Step '全站校验'
& py (Join-Path $PSScriptRoot 'remote.py') put (Join-Path $PSScriptRoot 'verify-deploy.py') "$RemoteDir/verify-deploy.py"
& py (Join-Path $PSScriptRoot 'remote.py') run "cd $RemoteDir && python3 verify-deploy.py ${Scheme}://$Domain"

Write-Host ''
Write-Host "部署完成，访问 ${Scheme}://$Domain" -ForegroundColor Green
