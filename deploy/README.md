# 生产部署说明

本站部署在一台**已有其它线上业务**的服务器上，因此采用了「不与现有服务争抢端口」的方案。

## 当前部署事实

| 项       | 值                                                         |
| -------- | ---------------------------------------------------------- |
| 访问地址 | <https://luotianyi.wiki>                                   |
| 服务器   | `192.168.31.106`                                           |
| 部署目录 | `/home/mlishu/luotianyi-wiki`                              |
| 对外端口 | 仅 `127.0.0.1:8081`（回环），由宿主机既有 nginx 统一入口   |
| 容器     | `lty-postgres` / `lty-meilisearch` / `lty-api` / `lty-web` |
| HTTPS    | Cloudflare 代理 + Flexible SSL（回源 HTTP）                |

## 架构

```
浏览器
  │  HTTPS
  ▼
Cloudflare（代理 / CDN / Bot 防护）
  │  HTTP :80  Host: luotianyi.wiki
  ▼
宿主机 nginx-proxy 容器（已有，独占 :80）
  │  /root/nginx/conf.d/luotianyi-wiki.conf
  │  proxy_pass → 127.0.0.1:8081
  ▼
lty-web 容器（Nginx 托管 SPA 静态文件）
  ├── /            → SPA（history 路由回退到 index.html）
  └── /api/*       → http://api:3000（容器内网）
                        │
                        ▼
                    lty-api（NestJS + Fastify）
                        ├── lty-postgres   （容器内网，不暴露）
                        └── lty-meilisearch（容器内网，不暴露）
```

**关键设计**：所有对外流量只经过宿主机已有的 `nginx-proxy`，本站不新增任何对外监听端口，因此不会与服务器上的 MySQL、fminfinity 等既有服务冲突。

## 为什么前端在本地构建

服务器可用内存仅约 580MB（同机还跑着 MySQL，占用约 400MB），在这台机器上跑 `vite build` 极可能触发 OOM 并拖挂线上业务。
因此：

- **前端**：本地 `vite build` → 只上传 2.2MB 静态产物
- **后端**：本地 `tsc` 编译 → 只上传 0.6MB JS，服务器仅执行 `npm install --omit=dev`（21 个生产依赖）

## 一键部署

```powershell
# 本地：构建 → 上传 → 重建镜像 → 重启 → 校验
pnpm deploy

# 复用上次构建产物（只改配置时用）
powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1 -SkipBuild

# 只跑线上校验
powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1 -OnlyVerify
```

服务器凭据存放在 `.local/deploy/server.json`（已被 `.gitignore` 忽略，不会提交）。

## 分步执行

```powershell
pnpm deploy:build     # 构建并组装 .local/deploy/bundle
pnpm deploy:upload    # 上传到 /home/mlishu/luotianyi-wiki
pnpm deploy:verify    # 线上全站校验（29 项）
```

## 服务器常用运维命令

```bash
cd /home/mlishu/luotianyi-wiki

docker compose ps                     # 查看状态
docker compose logs -f api            # 跟踪后端日志
docker compose restart api            # 重启后端
docker compose down                   # 停止全部（保留数据卷）
docker compose up -d                  # 启动全部

# 重建搜索索引（后台控制台也有按钮）
curl -X POST https://luotianyi.wiki/api/search/reindex \
     -H "Authorization: Bearer <登录接口返回的 token>"

# 数据库备份
docker compose exec -T postgres pg_dump -U luotianyi luotianyi_wiki > backup-$(date +%F).sql

# 数据库恢复
docker compose exec -T postgres psql -U luotianyi -d luotianyi_wiki < backup.sql
```

## 更新 nginx 配置

配置位置：`/root/nginx/conf.d/luotianyi-wiki.conf`（源文件在仓库 `deploy/nginx/`）

```bash
python3 /home/mlishu/luotianyi-wiki/verify-deploy.py    # 先确认服务正常

docker exec nginx-proxy nginx -t                # 校验语法
docker exec nginx-proxy nginx -s reload         # 平滑重载
```

**回滚**（让主域名恢复指向原有站点）：

```bash
rm /root/nginx/conf.d/luotianyi-wiki.conf
docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
```

## 数据卷

| 卷                          | 内容             |
| --------------------------- | ---------------- |
| `luotianyi-wiki_pg-data`    | PostgreSQL 数据  |
| `luotianyi-wiki_meili-data` | Meilisearch 索引 |

删除数据卷会清空所有数据，请先备份。

## 待处理的安全事项

1. **更换 root 密码并改用 SSH 密钥登录** —— 该密码曾以明文形式出现在聊天记录中。
2. **更换后台管理员密码** —— 当前沿用了本地开发用的 `luotianyi2026`，登录后在后台修改。
3. **升级为 Full (strict) SSL** —— 当前是 Cloudflare Flexible，Cloudflare 到源站之间为明文 HTTP。在 Cloudflare 后台 `SSL/TLS → Origin Server` 生成 Origin Certificate，配置到源站后可切到 Full (strict)。
4. **确认 Docker 开机自启** —— `systemctl is-enabled docker`，容器已设置 `restart: unless-stopped`。
