# 生产部署与更新

服务器上跑四个容器：`lty-postgres` / `lty-meilisearch` / `lty-api` / `lty-web`；
其中 `api` / `web` 的镜像由 GitHub Actions 构建并发布到 GHCR，**服务器只负责拉取运行，不在本机构建**。
本地开发不需要 Docker，见仓库根 [README 的「本地开发」](../README.md)。

```
① 本地开发                ② git push       ③ GitHub Actions                 ④ 服务器
pnpm dev（无 Docker） ─────────────────► 校验 → 构建 api/web 镜像 → GHCR ──► bash deploy/update.sh
                                          （自动，无需任何密钥）              （拉镜像 → 重建容器）
```

**日常只有一条命令**：在服务器上执行 `bash deploy/update.sh`。

## 首次部署（新服务器，只做一次）

前置条件：

1. 服务器装好 Docker 与 compose 插件（`docker --version`、`docker compose version`）；
2. 服务器能访问 `github.com` 与 `ghcr.io`；
3. 要部署的那个提交已经有成功的 CI 构建：GitHub → Actions →「CI（校验 → 构建并推送镜像）」变绿（也可以手动 Run workflow 触发一次）。

仓库是公开的，服务器上直接 clone 即可：

```bash
git clone https://github.com/lishu620/luotianyi-wiki.git
cd luotianyi-wiki
bash deploy/deploy.sh --prebuilt
```

脚本依次完成：生成 `deploy/.env`（随机密钥）→ 拉取镜像 → 启动 `postgres / meilisearch / api / web` → 等待后端就绪 → 写入示例数据（seed）→ 打印访问地址与后台账号口令。

| 项       | 默认值                                                                               |
| -------- | ------------------------------------------------------------------------------------ |
| 对外端口 | `80`（可用 `WEB_HOST_PORT` 覆盖）                                                    |
| 后台账号 | `admin`                                                                              |
| 后台口令 | **随机生成，部署结尾打印**；要固定则 `ADMIN_PASSWORD=你的口令 bash deploy/deploy.sh --prebuilt` |

> 宿主 80 端口已被占用时（本站线上就是这样）：`WEB_BIND_IP=127.0.0.1 WEB_HOST_PORT=8081 bash deploy/deploy.sh --prebuilt`
> 两个变量都会被写回 `deploy/.env`，之后 `update.sh` 不需要重复传参。

> `.env` 只在**不存在**时生成（除非 `--regen-env`）；`ADMIN_PASSWORD` 只在**首次创建 admin** 时生效，账号已存在时不会覆盖（原因见「忘记后台口令」）。
>
> ⚠️ 容器名固定为 `lty-*`，**同一台机器只能跑一套**；若旧部署用的是另一套目录/编排，先把它 `docker compose down` 掉。

## 日常更新：`bash deploy/update.sh`

push 到 `main` 后等 Actions 变绿，在服务器上执行：

```bash
cd <仓库目录>             # 例如 /home/mlishu/luotianyi-wiki
bash deploy/update.sh     # 就这么一条
```

它依次做：

1. `git pull --ff-only` 拉取最新代码（有本地改动会直接报错退出，不会硬覆盖）；
2. 解析「这次提交对应的镜像版本」——CI 对每个 `main` 提交都推了 `<commit-sha>` 标签；若这次提交只改了文档（CI 没构建镜像），自动往前找最近的可用版本；
3. `docker compose pull api web`，失败会重试 6 次 × 20 秒（用来等 CI 构建完）；**拉不到就直接退出，绝不碰正在运行的容器**；
4. `docker compose up -d --no-build` 重建 `api` / `web`（`postgres` / `meilisearch` 不动）；
5. 等后端就绪，再检查首页与 `/api` 反代；
6. 成功：把版本写回 `deploy/.env` 的 `IMAGE_TAG`，打印结果与回滚命令；失败：**自动回滚到上一个版本**（版本号取自运行中容器的 `org.opencontainers.image.revision` 标签）。

| 命令                                   | 作用                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `bash deploy/update.sh`                | 更新到当前代码对应的版本（日常）                        |
| `bash deploy/update.sh --tag latest`   | 更新到 CI 最近一次构建的镜像                            |
| `bash deploy/update.sh --tag <sha>`    | 更新 / 回滚到指定提交                                   |
| `bash deploy/update.sh --list`         | 列出最近 12 个提交，`✓` 表示镜像已发布                  |
| `bash deploy/update.sh --no-pull-code` | 不动代码，只按 `deploy/.env` 的 `IMAGE_TAG` 重建容器    |
| `bash deploy/update.sh --verify`       | 更新后再跑一遍全站校验（29 项断言，需服务器有 python3） |
| `bash deploy/update.sh --no-rollback`  | 失败时不自动回滚（排查问题时用）                        |

### 早期部署迁移到 `update.sh`

`update.sh` 依赖 `deploy/.env`（里面是数据库密码、`JWT_SECRET`、`MEILI_MASTER_KEY` 等）。
如果服务器上的容器是更早的流程装起来的、没有这个文件，**不要直接跑 `deploy.sh`** —— 它会生成新的随机数据库密码，与已有的 `pg-data` 数据卷对不上，后端会连不上库。正确做法是从原来的部署里把密钥抄进 `deploy/.env`（再补上 `WEB_BIND_IP`、`WEB_HOST_PORT`、`IMAGE_PREFIX`），然后执行 `bash deploy/update.sh`。

### 回滚

```bash
git log --oneline -10                        # 找到要回滚到的提交
bash deploy/update.sh --tag <commit-sha>     # 镜像还在 GHCR 上，秒级切换
```

## 镜像来源（GHCR）与国内网络

- 镜像名由 `IMAGE_PREFIX` 控制，默认 `ghcr.io/lishu620/luotianyi-wiki`，会写进 `deploy/.env`；同一个文件里的 `IMAGE_TAG` 表示**当前线上版本**，由 `update.sh` 自动维护。
- 国内拉 `ghcr.io` 慢时可走镜像源：`IMAGE_PREFIX=docker.m.daocloud.io/ghcr.io/lishu620/luotianyi-wiki bash deploy/update.sh`。
- 镜像默认随公开仓库**可匿名拉取**（已验证）；若改成 private，服务器需先 `docker login ghcr.io -u <用户名>`（PAT 需带 `read:packages`），并到 <https://github.com/lishu620?tab=packages> 调整 Package 可见性。

## 需要在服务器上构建镜像时（不推荐）

`bash deploy/deploy.sh`（不带 `--prebuilt`）会在**服务器上**构建镜像，`vite build` 峰值约 500MB 内存。可用内存只有 1.7G 且无 swap 的机器（同机还跑着 MySQL 等其它服务）建议先停栈再构建：

```bash
docker compose -f deploy/docker-compose.yml stop
bash deploy/deploy.sh
```

其他参数：`--no-cache` 全量重建（与 `--prebuilt` 互斥）、`--skip-seed` 不写示例数据、`--regen-env` 重新生成 `.env`（⚠️ 会换数据库密码，需先 `docker compose down -v`）。

---

## 历史方案与既有环境

以下描述的是**两台现有机器上已存在的部署**，供运维参考；新机器请用上面的 clone 流程。

本站部署在一台**已有其它线上业务**的服务器上，因此采用了「不与现有服务争抢端口」的方案。

## 当前部署事实

| 项       | 值                                                                  |
| -------- | ------------------------------------------------------------------- |
| 访问地址 | <https://luotianyi.wiki>                                            |
| 服务器   | `192.168.31.106`                                                    |
| 部署目录 | `/opt/luotianyi-wiki`                                               |
| 对外端口 | 仅 `127.0.0.1:8081`（回环），由宿主机既有 nginx 统一入口            |
| 容器     | `lty-postgres` / `lty-meilisearch` / `lty-api` / `lty-web`          |
| 入口     | 宿主机 Nginx（系统安装或容器版 `nginx-proxy`），反代到回环 `:8081` |

## 架构

```
浏览器
  │  HTTPS
  ▼
宿主机 Nginx（系统安装的 nginx 或容器版 nginx-proxy，独占 :80/:443）
  │  系统 Nginx：/etc/nginx/sites-enabled/luotianyi.wiki
  │  容器版    ：/root/nginx/conf.d/luotianyi-wiki.conf
  │  proxy_pass → 127.0.0.1:8081
  ▼
lty-web 容器（Nginx 托管 SPA 静态文件，仅绑定 127.0.0.1:8081）
  ├── /            → SPA（history 路由回退到 index.html）
  └── /api/*       → http://api:3000（容器内网）
                        │
                        ▼
                    lty-api（NestJS + Fastify）
                        ├── lty-postgres   （容器内网，不暴露）
                        └── lty-meilisearch（容器内网，不暴露）
```

**关键设计**：所有对外流量只经过宿主机已有的 Nginx，本站不新增任何对外监听端口，因此不会与服务器上的 MySQL、fminfinity 等既有服务冲突。

该场景下的首次部署命令：`WEB_BIND_IP=127.0.0.1 WEB_HOST_PORT=8081 bash deploy/deploy.sh --prebuilt`
（compose 里的映射是 `'${WEB_BIND_IP:-0.0.0.0}:${WEB_HOST_PORT:-80}:80'`，不设 `WEB_BIND_IP` 时会绑到所有网卡。）

> `deploy.sh` 与 `update.sh` 都会把 `WEB_BIND_IP` / `WEB_HOST_PORT` 写回 `deploy/.env`。
> 若 `.env` 是旧版本脚本生成的（没有这两项），执行一次
> `printf 'WEB_BIND_IP=127.0.0.1\nWEB_HOST_PORT=8081\n' >> deploy/.env` 再更新即可，
> 否则重建容器时会退回 `0.0.0.0:80`，在宿主机已占用 80 的机器上报 `address already in use`。

日常更新：`cd /opt/luotianyi-wiki && bash deploy/update.sh`（端口等配置从 `deploy/.env` 读取，不用重复传参）。

## 忘记后台口令

口令存的是 bcrypt 哈希，不可逆，只能重置。最直接的是改库：

```bash
COMPOSE="docker compose -f deploy/docker-compose.yml"

# 1) 生成新口令的哈希（借用 api 容器里的 bcryptjs）
$COMPOSE exec -T api node -e "require('bcryptjs').hash('你的新口令',10).then(h=>console.log(h))"

# 2) 写回数据库（注意 psql 里驼峰列名必须加双引号）
$COMPOSE exec -T postgres psql -U luotianyi -d luotianyi_wiki \
  -c "UPDATE users SET \"passwordHash\"='<第 1 步输出的哈希>' WHERE username='admin';"
```

或者用另一个有 `user.manage` 权限的账号登录后台 →「用户管理」→ 重置密码。

根因：`UsersService.ensureAdmin` 没传 `syncPassword`，所以 `ADMIN_PASSWORD` 只在**首次创建**账号时写入，之后改 `.env` 不会同步。

## 旧的「本地构建 + 上传产物」流程（备用）

`scripts/deploy/build-bundle.ps1` / `upload-bundle.py` / `deploy.ps1` 是早期方案：本地构建好后把 `api/`、`web/` 产物上传到服务器（bundle 布局，compose 里 `build: ./api`），服务器只跑 `npm install`。

⚠️ 它与现在的 `deploy/docker-compose.yml`（`build.context: ..`，容器内构建）**不是同一套布局**，混在同一目录会互相覆盖，谨慎使用。
服务器凭据放在 `.local/deploy/server.json`（已被 `.gitignore` 忽略，不会提交）。

```powershell
pnpm deploy:build     # 构建并组装 .local/deploy/bundle
pnpm deploy:upload    # 上传到服务器
powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1 -OnlyVerify   # 只跑线上校验
```

## 服务器常用运维命令

⚠️ 仓库**根目录**也有一个 `docker-compose.yml`（本地开发用的 `lty-dev-postgres` / `lty-dev-meilisearch`），所以生产命令必须带 `-f deploy/docker-compose.yml`，否则会操作错编排。

```bash
cd <仓库目录>   # 例如 /home/mlishu/luotianyi-wiki

# 更新到最新代码 + 最新镜像（日常就用这一条）
bash deploy/update.sh

# 只重启、不换版本
docker compose -f deploy/docker-compose.yml restart api

# 日常运维
docker compose -f deploy/docker-compose.yml ps           # 查看状态
docker compose -f deploy/docker-compose.yml logs -f api  # 跟踪后端日志
docker compose -f deploy/docker-compose.yml down         # 停止全部（保留数据卷）
docker compose -f deploy/docker-compose.yml up -d        # 启动全部（沿用 .env 里固定的 IMAGE_TAG）

# 当前线上版本 / 可用版本
docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' lty-api
bash deploy/update.sh --list

# 重建搜索索引（后台控制台也有按钮）
curl -X POST https://luotianyi.wiki/api/search/reindex \
     -H "Authorization: ****** token>"

# 数据库备份
docker compose -f deploy/docker-compose.yml exec -T postgres \
  pg_dump -U luotianyi luotianyi_wiki > backup-$(date +%F).sql

# 数据库恢复
docker compose -f deploy/docker-compose.yml exec -T postgres \
  psql -U luotianyi -d luotianyi_wiki < backup.sql
```

# 重建搜索索引（后台控制台也有按钮）
curl -X POST https://luotianyi.wiki/api/search/reindex \
     -H "Authorization: Bearer <登录接口返回的 token>"

# 数据库备份
docker compose -f deploy/docker-compose.yml exec -T postgres \
  pg_dump -U luotianyi luotianyi_wiki > backup-$(date +%F).sql

# 数据库恢复
docker compose -f deploy/docker-compose.yml exec -T postgres \
  psql -U luotianyi -d luotianyi_wiki < backup.sql
```

## 更新 nginx 配置

入口 Nginx 可能是**系统安装**的，也可能是**容器版 `nginx-proxy`**，改法不同：

### A. 系统安装的 Nginx（`/etc/nginx`）

站点配置：`/etc/nginx/sites-enabled/luotianyi.wiki`（通常是指向 `sites-available/` 的软链）。
在 **HTTPS 的 `server {}` 块内**（上传走 443）补上加粗两项：

```nginx
server {
    listen 443 ssl http2;
    server_name luotianyi.wiki www.luotianyi.wiki;

    client_max_body_size 16m;        # 表情广场上传（Nginx 默认只有 1m，否则 413）

    location / {
        proxy_pass http://127.0.0.1:8081;
        ...
        proxy_send_timeout 120s;     # 图片压缩较慢，默认 60s 可能超时
        proxy_read_timeout 120s;
    }
}
```

```bash
ls -l /etc/nginx/sites-enabled/luotianyi.wiki   # 确认真实文件（软链指向 sites-available）
sudo nginx -t && sudo systemctl reload nginx
```

### B. 容器版 `nginx-proxy`

配置位置：`/root/nginx/conf.d/luotianyi-wiki.conf`（源文件在仓库 `deploy/nginx/`）

```bash
python3 scripts/deploy/verify-deploy.py https://luotianyi.wiki    # 先确认服务正常

docker exec nginx-proxy nginx -t                # 校验语法
docker exec nginx-proxy nginx -s reload         # 平滑重载
```

**回滚**（让主域名恢复指向原有站点）：

```bash
# 系统 Nginx：还原备份或删除本站的 server 块后 reload
sudo nginx -t && sudo systemctl reload nginx

# 容器版：
rm /root/nginx/conf.d/luotianyi-wiki.conf
docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
```

## 数据卷

| 卷                          | 内容                                       |
| --------------------------- | ------------------------------------------ |
| `luotianyi-wiki_pg-data`    | PostgreSQL 数据                            |
| `luotianyi-wiki_meili-data` | Meilisearch 索引                           |
| `luotianyi-wiki_uploads-data` | 表情广场图片（展示图 + 无水印底图）      |

删除数据卷会清空所有数据，请先备份。表情图片可直接打包卷内容：

```bash
docker run --rm \
  -v luotianyi-wiki_uploads-data:/data \
  -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

## 待处理的安全事项

1. **更换 root 密码并改用 SSH 密钥登录** —— 该密码曾以明文形式出现在聊天记录中。
2. **更换后台管理员密码** —— 新部署的后台口令是随机生成并在部署结尾打印的，登录后建议再改一次；若曾用过固定口令则必须改。
3. **升级为 Full (strict) SSL** —— 当前是 Cloudflare Flexible，Cloudflare 到源站之间为明文 HTTP。在 Cloudflare 后台 `SSL/TLS → Origin Server` 生成 Origin Certificate，配置到源站后可切到 Full (strict)。
4. **确认 Docker 开机自启** —— `systemctl is-enabled docker`，容器已设置 `restart: unless-stopped`。
