# 备用部署脚本（本地构建 + SSH 上传）

> **日常部署/更新走 CI + 服务器一条命令**，见仓库根 [README「部署与更新」](../../README.md) 与 [`deploy/README.md`](../deploy/README.md)：
> 本地 `pnpm dev` 开发 → push → GitHub Actions 构建镜像到 GHCR → 服务器 `bash deploy/update.sh`。
>
> 这里的一套是**备用方案**：服务器不便访问 GitHub / GHCR 时，在本地构建好产物再 SSH 上传（本地只需 Node.js + Python，不需要 Docker）。
> 完整的部署架构与运维说明见 [`deploy/README.md`](../deploy/README.md)。

## 目录内容

| 文件 | 作用 |
| --- | --- |
| `remote.py` | SSH/SFTP 远程执行工具（凭据读自 `.local/deploy/server.json`） |
| `build-bundle.ps1` | 本地构建前后端，组装生产部署包、生成随机密钥、导出数据库 |
| `upload-bundle.py` | 把部署包上传到服务器 `/home/mlishu/luotianyi-wiki` |
| `deploy.ps1` | 一键串联上面三步：构建 → 上传 → 重启 → 校验 |
| `verify-deploy.py` | 线上全站校验脚本（29 项断言，在服务器上运行） |

## 常用命令

> ⚠️ 这条流程上传的是早期 bundle 布局（compose 在仓库根目录），与 git clone 得到的 `deploy/docker-compose.yml` 布局不是同一套，**不要混用**，否则会互相覆盖。

```powershell
pnpm deploy            # 一键部署 + 校验
pnpm deploy:build      # 只构建打包
pnpm deploy:upload     # 只上传
pnpm deploy:verify     # 只校验线上

# 直接执行远程命令（bundle 布局下 compose 在仓库根目录）
py scripts/deploy/remote.py info
py scripts/deploy/remote.py run "docker compose -f /home/mlishu/luotianyi-wiki/docker-compose.yml ps"
py scripts/deploy/remote.py put 本地文件 远端路径
py scripts/deploy/remote.py putdir 本地目录 远端目录
```

## 两点注意事项

**1. Windows 上的 `.ps1` 必须存为 UTF-8 with BOM**

PowerShell 5.1 读取无 BOM 的 UTF-8 文件时会按 ANSI 解码，中文注释变乱码后可能破坏引号配对，报「字符串缺少终止符」之类的解析错误。
如果脚本报出莫名其妙的语法错误，先检查编码：

```powershell
$enc = New-Object System.Text.UTF8Encoding $true
$p = (Resolve-Path 'scripts\deploy\build-bundle.ps1').Path
[System.IO.File]::WriteAllText($p, [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8), $enc)
```

**2. 远程命令里不要出现 `$`**

命令通过 `py scripts/deploy/remote.py run "<命令>"` 传递时，外层是 PowerShell 双引号，`$` 会被 PowerShell 提前展开。需要 shell 变量时，改把逻辑写进一个 `.py`/`.sh` 文件上传后执行。
