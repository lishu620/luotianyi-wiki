# ---------- 运行时镜像：不包含任何构建步骤，只装生产依赖 ----------
# 构建上下文 = 本目录（由 scripts/deploy/build-bundle.ps1 组装）
#   ./
#   ├── Dockerfile
#   ├── package.json      （由 apps/api/package.json 生成的纯生产清单）
#   ├── dist/             （apps/api/dist 编译产物）
#   └── shared/           （@luotianyi/shared 的 dist + package.json）
FROM node:22-alpine

ENV NODE_ENV=production \
    TZ=Asia/Shanghai

WORKDIR /app

# 先装依赖，利用 Docker 层缓存
COPY package.json ./
COPY shared ./shared
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock \
 && npm cache clean --force

# 再放编译产物
COPY dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/stats/overview').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
