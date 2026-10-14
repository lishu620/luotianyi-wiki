<#
.SYNOPSIS
  组装生产部署包（本地构建，服务器只做轻量 npm install）。

.DESCRIPTION
  1. 构建 shared / api / web
  2. 把产物与 Dockerfile、compose 文件组装到 .local/deploy/bundle
  3. 由 apps/api/package.json 生成纯生产依赖清单
  4. 生成随机密钥写入 .env
  5. 导出本地数据库为 dump.sql

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/deploy/build-bundle.ps1
  powershell -ExecutionPolicy Bypass -File scripts/deploy/build-bundle.ps1 -SkipBuild -KeepEnv
#>
param(
  [string]$BundleDir = (Join-Path $PSScriptRoot '..\..\.local\deploy\bundle'),
  [string]$Domain = '192.168.31.106',
  [int]$WebHostPort = 80,
  [switch]$SkipBuild,
  [switch]$KeepEnv,
  [switch]$SkipDump
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$BundleDir = [System.IO.Path]::GetFullPath($BundleDir)

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function New-Secret([int]$Bytes = 36) {
  $buffer = New-Object byte[] $Bytes
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($buffer)
  return ([Convert]::ToBase64String($buffer) -replace '[+/=]', 'x')
}

function New-AlphaNumericSecret([int]$Length = 28) {
  $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  $buffer = New-Object byte[] $Length
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  -join ($buffer | ForEach-Object { $chars[$_ % $chars.Length] })
}

# ---------------------------------------------------------------- 构建
if (-not $SkipBuild) {
  Write-Step '构建 shared / api / web'
  Push-Location $RepoRoot
  try {
    & pnpm --filter @luotianyi/shared build
    if ($LASTEXITCODE -ne 0) { throw 'shared 构建失败' }
    & pnpm --filter @luotianyi/api build
    if ($LASTEXITCODE -ne 0) { throw 'api 构建失败' }
    & pnpm --filter @luotianyi/web build
    if ($LASTEXITCODE -ne 0) { throw 'web 构建失败' }
  } finally {
    Pop-Location
  }
} else {
  Write-Step '跳过构建（-SkipBuild）'
}

# ---------------------------------------------------------------- 目录
Write-Step "组装部署包 $BundleDir"
if (Test-Path $BundleDir) { Remove-Item -Recurse -Force $BundleDir }
New-Item -ItemType Directory -Force -Path (Join-Path $BundleDir 'api\shared'), (Join-Path $BundleDir 'web\dist'), (Join-Path $BundleDir 'nginx') | Out-Null

Copy-Item (Join-Path $RepoRoot 'deploy\api\Dockerfile') (Join-Path $BundleDir 'api\Dockerfile') -Force
Copy-Item (Join-Path $RepoRoot 'deploy\web\Dockerfile') (Join-Path $BundleDir 'web\Dockerfile') -Force
Copy-Item (Join-Path $RepoRoot 'deploy\web\nginx.conf') (Join-Path $BundleDir 'web\nginx.conf') -Force
Copy-Item (Join-Path $RepoRoot 'deploy\docker-compose.yml') (Join-Path $BundleDir 'docker-compose.yml') -Force
Copy-Item (Join-Path $RepoRoot 'deploy\nginx\luotianyi-wiki.conf') (Join-Path $BundleDir 'nginx\luotianyi-wiki.conf') -Force
Copy-Item (Join-Path $RepoRoot 'apps\api\dist') (Join-Path $BundleDir 'api\dist') -Recurse -Force
Copy-Item (Join-Path $RepoRoot 'packages\shared\dist') (Join-Path $BundleDir 'api\shared\dist') -Recurse -Force
Copy-Item (Join-Path $RepoRoot 'packages\shared\package.json') (Join-Path $BundleDir 'api\shared\package.json') -Force
Copy-Item (Join-Path $RepoRoot 'apps\web\dist\*') (Join-Path $BundleDir 'web\dist') -Recurse -Force
Write-Host '    产物已复制' -ForegroundColor Green

# ---------------------------------------------------------------- 生产依赖清单
Write-Step '生成 api 生产依赖清单'
# PowerShell 5.1 的 Get-Content 默认按 ANSI 读取，必须显式指定 UTF8，否则中文描述会变成乱码并导致 JSON 解析失败
$apiPkg = Get-Content (Join-Path $RepoRoot 'apps\api\package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$deps = [ordered]@{}
foreach ($prop in $apiPkg.dependencies.PSObject.Properties) {
  $deps[$prop.Name] = $prop.Value
}
# 工作区依赖改为本地相对路径，容器内由 npm 链接到 ./shared
$deps['@luotianyi/shared'] = 'file:./shared'

$prodPkg = [ordered]@{
  name        = 'luotianyi-api-runtime'
  version     = $apiPkg.version
  private     = $true
  description = '洛天依 Wiki 后端运行时（仅生产依赖）'
  main        = 'dist/main.js'
  dependencies = $deps
}
$prodJson = $prodPkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText(
  (Join-Path $BundleDir 'api\package.json'),
  $prodJson,
  (New-Object System.Text.UTF8Encoding $false)
)
Write-Host "    生产依赖共 $($deps.Count) 个" -ForegroundColor Green

# ---------------------------------------------------------------- .env
$envPath = Join-Path $BundleDir '.env'
if ($KeepEnv -and (Test-Path $envPath)) {
  Write-Step '保留已有 .env'
} else {
  Write-Step '生成 .env 与随机密钥'
  $dbPassword = New-AlphaNumericSecret 28
  $jwtSecret = New-Secret 48
  $meiliKey = New-Secret 32
  $adminPassword = New-AlphaNumericSecret 16

  $envContent = @"
# 由 scripts/deploy/build-bundle.ps1 自动生成，生成时间 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
CORS_ORIGINS=*

DB_USERNAME=luotianyi
DB_PASSWORD=$dbPassword
DB_DATABASE=luotianyi_wiki

JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=7d

MEILI_MASTER_KEY=$meiliKey

ADMIN_USERNAME=admin
ADMIN_PASSWORD=$adminPassword

WEB_HOST_PORT=$WebHostPort
"@
  [System.IO.File]::WriteAllText($envPath, $envContent, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "    .env 已生成（含随机密钥）" -ForegroundColor Green
}

# ---------------------------------------------------------------- 数据库导出
if (-not $SkipDump) {
  Write-Step '导出本地数据库'
  $pgDump = Join-Path $RepoRoot '.local\pgsql\bin\pg_dump.exe'
  if (Test-Path $pgDump) {
    $dumpPath = Join-Path $BundleDir 'dump.sql'
    $env:PGPASSWORD = 'luotianyi'
    & $pgDump -h 127.0.0.1 -p 5432 -U luotianyi -d luotianyi_wiki `
      --no-owner --no-privileges --clean --if-exists `
      -f $dumpPath
    if ($LASTEXITCODE -eq 0 -and (Test-Path $dumpPath)) {
      $sizeKb = [math]::Round((Get-Item $dumpPath).Length / 1KB, 1)
      Write-Host "    dump.sql 已导出（$sizeKb KB）" -ForegroundColor Green
    } else {
      Write-Host '    导出失败，跳过（部署后再补）' -ForegroundColor Yellow
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  } else {
    Write-Host '    未找到本地 pg_dump，跳过导出' -ForegroundColor Yellow
  }
}

# ---------------------------------------------------------------- 汇总
Write-Step '部署包内容'
Get-ChildItem $BundleDir | ForEach-Object {
  if ($_.PSIsContainer) {
    $mb = [math]::Round(((Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB), 2)
    Write-Host ("    {0,-20} {1} MB" -f $_.Name, $mb)
  } else {
    Write-Host ("    {0,-20} {1} KB" -f $_.Name, [math]::Round($_.Length / 1KB, 1))
  }
}
Write-Host ''
Write-Host '下一步：' -ForegroundColor Green
Write-Host '    py scripts/deploy/upload-bundle.py'
