# ---------- 运行时镜像：Caddy/nginx 之外的纯静态托管 ----------
# 构建上下文 = 本目录（由 scripts/deploy/build-bundle.ps1 组装）
#   ./
#   ├── Dockerfile
#   ├── nginx.conf
#   └── dist/             （apps/web/dist 构建产物）
FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
