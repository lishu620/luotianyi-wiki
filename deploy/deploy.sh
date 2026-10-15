#!/usr/bin/env bash
# =============================================================================
#  洛天依 Wiki 一键部署脚本（在服务器上执行）
#
#  做的事：生成密钥(.env) → 构建镜像 → 启动全部容器 → 初始化数据 → 输出地址
#  组件  ：web(Nginx 前端) + api(NestJS 后端) + postgres(数据库) + meilisearch(搜索)
#  端口  ：对外只暴露前端一个（WEB_HOST_PORT，默认 80）
#
#  后台账号：用户名 admin（固定），口令默认随机生成并在部署结尾打印；
#            也可用环境变量指定，例：ADMIN_PASSWORD=xxxx bash deploy/deploy.sh
#
#  用法（在仓库根目录执行）：
#    bash deploy/deploy.sh                 # 首次部署 / 更新（在服务器上构建，增量）
#    bash deploy/deploy.sh --prebuilt      # 不在本机构建，直接拉取已发布镜像（弱性能主机推荐）
#    bash deploy/deploy.sh --no-cache      # 不使用构建缓存，全量重建
#    bash deploy/deploy.sh --skip-seed     # 不写入示例数据
#    bash deploy/deploy.sh --regen-env     # 重新生成 .env（注意：改密钥后需清空数据卷）
#
#  可用环境变量：WEB_HOST_PORT / WEB_BIND_IP / IMAGE_PREFIX / IMAGE_TAG
#                ADMIN_USERNAME / ADMIN_PASSWORD
# =============================================================================
set -euo pipefail

NO_CACHE=0
SKIP_SEED=0
REGEN_ENV=0
PREBUILT=0
for arg in "$@"; do
  case "$arg" in
    --prebuilt)  PREBUILT=1 ;;
    --no-cache)  NO_CACHE=1 ;;
    --skip-seed) SKIP_SEED=1 ;;
    --regen-env) REGEN_ENV=1 ;;
    # 打印文件头部的注释块（第 1 行之后，到第二个「全 # =」分隔线为止）
    -h|--help)   awk 'NR > 1 { print; if (/^# =+$/ && ++n == 2) exit }' "$0"; exit 0 ;;
    *) echo "未知参数: $arg" >&2; exit 2 ;;
  esac
done
if [ "$PREBUILT" = 1 ] && [ "$NO_CACHE" = 1 ]; then
  echo "--prebuilt 与 --no-cache 不能同时使用（预构建模式不会在本地构建）" >&2
  exit 2
fi

cd "$(dirname "$0")"   # 切到 deploy/（compose 与 .env 所在目录）

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m    %s\033[0m\n' "$*"; }
warn() { printf '\033[33m    %s\033[0m\n' "$*"; }
die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

gen() { local n="${1:-32}"; LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$n" || true; }

# ---------------------------------------------------------------- 环境检查
command -v docker >/dev/null 2>&1 || die "未检测到 Docker，请先安装：https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "未检测到 docker compose 插件（Docker Compose v2）"

# ---------------------------------------------------------------- 基础镜像（含国内镜像源兜底）
ensure_image() {
  local ref="$1" mirror="$2"
  docker image inspect "$ref" >/dev/null 2>&1 && return 0
  printf '\033[36m==> 拉取基础镜像 %s\033[0m\n' "$ref"
  if ! docker pull "$ref" >/dev/null 2>&1; then
    warn "官方源拉取失败，改用镜像源 $mirror"
    docker pull "$mirror" && docker tag "$mirror" "$ref"
  fi
}
# 预构建模式不需要构建用的基础镜像（node / nginx）
if [ "$PREBUILT" != 1 ]; then
  ensure_image node:22-alpine            docker.m.daocloud.io/library/node:22-alpine
  ensure_image nginx:alpine              docker.m.daocloud.io/library/nginx:alpine
fi
ensure_image postgres:16-alpine          docker.m.daocloud.io/library/postgres:16-alpine
ensure_image getmeili/meilisearch:v1.11  docker.m.daocloud.io/getmeili/meilisearch:v1.11

# ---------------------------------------------------------------- 生成 .env
if [ ! -f .env ] || [ "$REGEN_ENV" = 1 ]; then
  if [ "$REGEN_ENV" = 1 ] && [ -f .env ]; then
    warn "重新生成 .env 会更换数据库密码，旧的 postgres 数据卷将无法登录；"
    warn "如需一并重来，请先执行：docker compose down -v"
  fi
  log "生成 deploy/.env（随机密钥）"
  PORT="${WEB_HOST_PORT:-80}"
  # 后台账号：用户名默认 admin；口令默认随机生成（部署结尾会打印）。
  # 公共仓库里不写死任何口令，需要固定口令就显式传入 ADMIN_PASSWORD。
  ADMIN_USER="${ADMIN_USERNAME:-admin}"
  ADMIN_PASS="${ADMIN_PASSWORD:-$(gen 16)}"

  cat > .env <<EOF
# 由 deploy/deploy.sh 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')
# 前端与 /api 同源；CORS 回显任意来源，宿主机 IP 变更无需改配置
CORS_ORIGINS=*

DB_USERNAME=luotianyi
DB_PASSWORD=$(gen 28)
DB_DATABASE=luotianyi_wiki
DB_SYNCHRONIZE=true

JWT_SECRET=$(gen 48)
JWT_EXPIRES_IN=7d

MEILI_MASTER_KEY=$(gen 36)

ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS

# 镜像来源：--prebuilt 模式会从这里拉取（CI 构建后推到 GHCR）
IMAGE_PREFIX=${IMAGE_PREFIX:-ghcr.io/lishu620/luotianyi-wiki}
IMAGE_TAG=${IMAGE_TAG:-latest}

# 对外只暴露的前端端口（WEB_BIND_IP 可选，用于只绑回环）
WEB_HOST_PORT=$PORT
EOF
  ok ".env 已生成（CORS=*，不绑定具体 IP；后台 $ADMIN_USER / $ADMIN_PASS）"
else
  log "复用已有 deploy/.env（如需更换密钥请加 --regen-env）"
fi

PORT="$(grep -E '^WEB_HOST_PORT=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
PORT="${PORT:-80}"
ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
ADMIN_USER="$(grep -E '^ADMIN_USERNAME=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
ADMIN_USER="${ADMIN_USER:-admin}"

# ---------------------------------------------------------------- 获取镜像并启动
if [ "$PREBUILT" = 1 ]; then
  log "拉取已发布的 api / web 镜像（不在本机构建）"
  if ! docker compose pull api web; then
    die "拉取镜像失败。首次使用请先把 GHCR 上两个 Package 设为 public（GitHub → 你的头像 → Packages），或先执行 docker login ghcr.io -u <用户名>"
  fi
  log "启动全部服务"
  docker compose up -d --no-build
else
  if [ "$NO_CACHE" = 1 ]; then
    log "全量构建镜像（--no-cache）"
    docker compose build --no-cache
  fi
  log "构建镜像并启动全部服务"
  docker compose up -d --build
fi

# ---------------------------------------------------------------- 等待后端就绪
log "等待后端就绪"
READY=0
for i in $(seq 1 60); do
  if docker compose exec -T api node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/stats/overview').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    READY=1
    ok "后端已就绪"
    break
  fi
  sleep 3
done
if [ "$READY" != 1 ]; then
  warn "后端在等待时间内未就绪，可用以下命令排查：docker compose logs -f api"
fi

# ---------------------------------------------------------------- 初始化数据
if [ "$SKIP_SEED" != 1 ]; then
  log "写入示例数据（管理员 / 介绍分节 / 歌曲 / 外链）"
  docker compose exec -T api node dist/database/seed.js || warn "seed 未完成（可能数据已存在），可稍后手动重跑"
fi

# ---------------------------------------------------------------- 收尾
log "容器状态"
docker compose ps

HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
HOST_IP="${HOST_IP:-127.0.0.1}"
if [ "$PORT" = "80" ]; then URL="http://$HOST_IP"; else URL="http://$HOST_IP:$PORT"; fi

printf '\n'
ok "部署完成 🎉"
ok "访问地址：$URL"
ok "后台管理：$URL/admin（账号 $ADMIN_USER / 密码 $ADMIN_PASSWORD）"
if [ "$PREBUILT" = 1 ]; then
  ok "镜像来源：$IMAGE_PREFIX-api/$IMAGE_PREFIX-web（$IMAGE_TAG）"
fi
