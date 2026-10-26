#!/usr/bin/env bash
# =============================================================================
#  洛天依 Wiki 线上更新脚本（在服务器上执行，不在本地跑）
#
#  做的事：拉取最新代码 → 解析目标版本 → 拉取 CI 已构建好的镜像 → 重建 api/web
#          → 等后端就绪 → 检查首页与 /api 反代 → 失败自动回滚到上一个版本
#
#  前置：这台机器上已经成功部署过一次（存在 deploy/.env，见 deploy/deploy.sh）
#
#  用法（在仓库根目录执行）：
#    bash deploy/update.sh                 # 更新到当前代码对应的版本（日常用这个）
#    bash deploy/update.sh --tag latest    # 更新到 CI 最近一次构建（不跟随提交）
#    bash deploy/update.sh --tag <sha>     # 更新 / 回滚到指定提交
#    bash deploy/update.sh --list          # 列出最近几个提交及镜像是否已发布
#    bash deploy/update.sh --no-pull-code  # 不动代码，只按当前 .env 的 IMAGE_TAG 重建
#    bash deploy/update.sh --verify        # 更新后跑一遍全站校验（需服务器有 python3）
#    bash deploy/update.sh --no-rollback   # 失败时不自动回滚（排查问题时用）
#
#  说明：CI 对 main 的每次推送都会构建 <commit-sha> 标签的镜像，所以版本与提交一一
#        对应，回滚只需 bash deploy/update.sh --tag <上一个提交号>。
# =============================================================================
set -euo pipefail

log()  { printf '\n\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m    %s\033[0m\n' "$*"; }
warn() { printf '\033[33m    %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

TAG=""
LIST_ONLY=0
PULL_CODE=1
VERIFY=0
AUTO_ROLLBACK=1
PULL_RETRIES=6      # 刚 push 完 CI 可能还在构建：最多重试 6 次 × 20 秒
CANDIDATES=12       # 目标版本解析时回溯的提交数（文档类提交没有镜像，需要往前找）

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)          [ -n "${2:-}" ] || die "--tag 需要跟一个版本号（commit sha 或 latest）"; TAG="$2"; shift 2 ;;
    --list)         LIST_ONLY=1; shift ;;
    --no-pull-code) PULL_CODE=0; shift ;;
    --verify)       VERIFY=1; shift ;;
    --no-rollback)  AUTO_ROLLBACK=0; shift ;;
    -h|--help)      awk 'NR > 1 { print; if (/^# =+$/ && ++n == 2) exit }' "$0"; exit 0 ;;
    *)              die "未知参数: $1" ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "未检测到 Docker"
docker compose version >/dev/null 2>&1 || die "未检测到 docker compose 插件（Compose v2）"

cd "$(dirname "$0")"
[ -f docker-compose.yml ] || die "未找到 deploy/docker-compose.yml（本脚本需要和仓库一起使用）"
DEPLOY_DIR="$PWD"
REPO_ROOT="$(cd .. && pwd)"
[ -f "$DEPLOY_DIR/.env" ] || die "缺少 deploy/.env：这台机器还没部署过，请先执行 bash deploy/deploy.sh --prebuilt"

COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.yml")

env_get() {
  grep -E "^$1=" "$DEPLOY_DIR/.env" 2>/dev/null | tail -n 1 | cut -d= -f2- \
    | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' || true
}

env_put() {
  local key="$1" value="$2"
  if grep -q "^$key=" "$DEPLOY_DIR/.env"; then
    sed -i "s|^$key=.*|$key=$value|" "$DEPLOY_DIR/.env"
  else
    printf '%s=%s\n' "$key" "$value" >> "$DEPLOY_DIR/.env"
  fi
}

prefix_from_remote() {
  local url stripped
  url="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
  [ -n "$url" ] || return 1
  stripped="${url%.git}"
  case "$stripped" in
    *github.com[:/]*) printf 'ghcr.io/%s' "${stripped#*github.com[:/]}" ;;
    *) return 1 ;;
  esac
}

# ---------------------------------------------------------------- 基础信息
IMAGE_PREFIX="$(env_get IMAGE_PREFIX)"
if [ -z "$IMAGE_PREFIX" ]; then
  IMAGE_PREFIX="$(prefix_from_remote || true)"
fi
IMAGE_PREFIX="${IMAGE_PREFIX:-ghcr.io/lishu620/luotianyi-wiki}"

WEB_BIND_IP="${WEB_BIND_IP:-$(env_get WEB_BIND_IP)}"
WEB_BIND_IP="${WEB_BIND_IP:-0.0.0.0}"
WEB_HOST_PORT="${WEB_HOST_PORT:-$(env_get WEB_HOST_PORT)}"
WEB_HOST_PORT="${WEB_HOST_PORT:-80}"
ADMIN_USER="$(env_get ADMIN_USERNAME)"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="$(env_get ADMIN_PASSWORD)"

# docker manifest inspect 用于「不下载就判断某个版本是否已发布」；老版本 Docker 没有该命令
MANIFEST_OK=1
docker manifest inspect --help >/dev/null 2>&1 || MANIFEST_OK=0

image_exists() {
  [ "$MANIFEST_OK" = 1 ] || return 1
  docker manifest inspect "$IMAGE_PREFIX-api:$1" >/dev/null 2>&1
}

list_available() {
  log "最近提交与镜像发布情况（$IMAGE_PREFIX-api）"
  [ -d "$REPO_ROOT/.git" ] || die "不是 git 仓库，无法列出提交"
  [ "$MANIFEST_OK" = 1 ] || warn "当前 Docker 不支持 manifest inspect，无法判断镜像是否已发布"
  local sha
  for sha in $(git -C "$REPO_ROOT" rev-list -n "$CANDIDATES" HEAD); do
    if image_exists "$sha"; then
      printf '\033[32m    ✓ %s  %s\033[0m\n' "$(git -C "$REPO_ROOT" log -1 --format='%h' "$sha")" \
        "$(git -C "$REPO_ROOT" log -1 --format='%s' "$sha")"
    else
      printf '      %s  %s\n' "$(git -C "$REPO_ROOT" log -1 --format='%h' "$sha")" \
        "$(git -C "$REPO_ROOT" log -1 --format='%s' "$sha")"
    fi
  done
  printf '\n'
}

if [ "$LIST_ONLY" = 1 ]; then
  list_available
  exit 0
fi

# ---------------------------------------------------------------- 更新代码
if [ "$PULL_CODE" = 1 ] && [ -d "$REPO_ROOT/.git" ]; then
  log "拉取最新代码"
  if ! git -C "$REPO_ROOT" pull --ff-only; then
    die "git pull 失败：服务器上有未提交的改动或分支偏离。先处理（git -C $REPO_ROOT status）再执行，或加 --no-pull-code 只更新镜像。"
  fi
  ok "$(git -C "$REPO_ROOT" log -1 --format='%h %s')"
fi

# ---------------------------------------------------------------- 解析目标版本
log "解析目标版本"
if [ -n "$TAG" ]; then
  TARGET="$TAG"
elif [ "$PULL_CODE" = 0 ]; then
  # --no-pull-code：不动代码，沿用 .env 里记的版本
  TARGET="$(env_get IMAGE_TAG)"
  TARGET="${TARGET:-latest}"
else
  TARGET=""
  if [ -d "$REPO_ROOT/.git" ]; then
    for sha in $(git -C "$REPO_ROOT" rev-list -n "$CANDIDATES" HEAD); do
      if image_exists "$sha"; then TARGET="$sha"; break; fi
    done
  fi
  if [ -z "$TARGET" ]; then
    warn "没找到与当前提交对应的镜像，改用 latest（可能 CI 还在构建，或 Docker 不支持 manifest 检查）"
    TARGET="latest"
  fi
fi

CURRENT_TAG="$(env_get IMAGE_TAG)"
CURRENT_TAG="${CURRENT_TAG:-latest}"
PREV_REV="$(docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' lty-api 2>/dev/null || true)"
PREV_IMAGE_ID="$(docker inspect -f '{{.Image}}' lty-api 2>/dev/null || true)"

log "本次更新"
ok "当前版本：$CURRENT_TAG${PREV_REV:+（标签 $PREV_REV）}"
ok "目标版本：$TARGET"
ok "镜像来源：$IMAGE_PREFIX-{api,web}"

# ---------------------------------------------------------------- 拉取镜像
pull_images() {
  local tag="$1" i
  for i in $(seq 1 "$PULL_RETRIES"); do
    if IMAGE_PREFIX="$IMAGE_PREFIX" IMAGE_TAG="$tag" "${COMPOSE[@]}" pull api web; then
      return 0
    fi
    if [ "$i" -lt "$PULL_RETRIES" ]; then
      warn "拉取 $tag 失败（第 $i/$PULL_RETRIES 次），20 秒后重试…"
      sleep 20
    fi
  done
  return 1
}

log "拉取镜像 $TARGET"
if ! pull_images "$TARGET"; then
  die "镜像 $IMAGE_PREFIX-api:$TARGET 拉取失败。常见原因：① CI 还在构建，等 Actions 变绿后重试；② 该提交没有代码改动（只改了文档）所以没有镜像，可用 --tag latest；③ 版本号写错。"
fi

# ---------------------------------------------------------------- 重建容器
log "重建 api / web 容器"
ok "web 端口：$WEB_BIND_IP:$WEB_HOST_PORT → 容器 80"

if ! IMAGE_PREFIX="$IMAGE_PREFIX" IMAGE_TAG="$TARGET" "${COMPOSE[@]}" up -d --no-build; then
  warn "重建容器失败。若错误为 address already in use，说明宿主 $WEB_HOST_PORT 端口已被占用"
  warn "（常见于宿主机自身装了 Nginx/Apache）。把 web 容器改成只绑回环端口："
  warn "  在 deploy/.env 里写入 WEB_BIND_IP=127.0.0.1 与 WEB_HOST_PORT=8081，再重跑本脚本"
  warn "  并把宿主机 Nginx 的 proxy_pass 指向 http://127.0.0.1:8081"
  die "重建容器失败，请按上面的提示处理后重试"
fi

wait_api_ready() {
  local i
  for i in $(seq 1 60); do
    if "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:'+(process.env.API_PORT||3000)+'/api/stats/overview').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  return 1
}

# 借 api 容器里的 node 做检查，服务器宿主机不需要装 curl
check_web_spa() {
  "${COMPOSE[@]}" exec -T api node -e "fetch('http://web/').then(async r=>{const t=await r.text();process.exit(r.ok&&t.includes('id=\"app\"')?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
}

check_api_via_web() {
  "${COMPOSE[@]}" exec -T api node -e "fetch('http://web/api/stats/overview').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1
}

log "等待后端就绪"
HEALTHY=0
if wait_api_ready; then
  ok "后端已就绪"
  if check_web_spa && check_api_via_web; then
    ok "首页与 /api 反代正常"
    HEALTHY=1
  else
    warn "首页或 /api 反代检查未通过"
  fi
else
  warn "后端在等待时间内未就绪"
fi

# ---------------------------------------------------------------- 校验 / 回滚
if [ "$HEALTHY" = 1 ]; then
  env_put IMAGE_PREFIX "$IMAGE_PREFIX"
  env_put IMAGE_TAG "$TARGET"
  # 端口绑定也要落盘，否则下次更新会退回 0.0.0.0:80（宿主机 80 被占用时直接失败）
  env_put WEB_BIND_IP "$WEB_BIND_IP"
  env_put WEB_HOST_PORT "$WEB_HOST_PORT"

  if [ "$VERIFY" = 1 ]; then
    log "全站校验"
    if command -v python3 >/dev/null 2>&1 && [ -f "$REPO_ROOT/scripts/deploy/verify-deploy.py" ]; then
      if ! python3 "$REPO_ROOT/scripts/deploy/verify-deploy.py" "http://127.0.0.1:$WEB_HOST_PORT" "$ADMIN_USER" "${ADMIN_PASSWORD:-admin}"; then
        warn "全站校验存在失败项，请按上面的输出排查"
      fi
    else
      warn "跳过：需要服务器安装 python3（且仓库内 scripts/deploy/verify-deploy.py 存在）"
    fi
  fi

  AFTER_IMAGE_ID="$(docker inspect -f '{{.Image}}' lty-api 2>/dev/null || true)"
  printf '\n'
  if [ -n "$PREV_IMAGE_ID" ] && [ "$AFTER_IMAGE_ID" = "$PREV_IMAGE_ID" ]; then
    ok "更新完成：该版本本来就在运行，容器未更换（$TARGET）"
  else
    ok "更新完成 🎉  当前版本 $TARGET"
  fi
  ok "访问地址：http://127.0.0.1:$WEB_HOST_PORT（对外入口见 README 的架构说明）"
  ok "deploy/.env 里的 IMAGE_TAG 已固定为 $TARGET（想跟随最新镜像就 --tag latest）"
  if [ -n "$PREV_REV" ] && [ "$PREV_REV" != "$TARGET" ]; then
    ok "如需回滚：bash deploy/update.sh --tag $PREV_REV"
  fi
  exit 0
fi

printf '\n'
warn "本次更新未通过健康检查"
"${COMPOSE[@]}" ps || true

if [ "$AUTO_ROLLBACK" = 1 ] && [ -n "$PREV_REV" ] && [ "$PREV_REV" != "$TARGET" ]; then
  log "自动回滚到上一个版本 $PREV_REV"
  if pull_images "$PREV_REV" \
    && IMAGE_PREFIX="$IMAGE_PREFIX" IMAGE_TAG="$PREV_REV" "${COMPOSE[@]}" up -d --no-build \
    && wait_api_ready; then
    env_put IMAGE_PREFIX "$IMAGE_PREFIX"
    env_put IMAGE_TAG "$PREV_REV"
    ok "已回滚到 $PREV_REV"
    die "更新失败，已回滚。排查日志：docker compose -f deploy/docker-compose.yml logs --tail=100 api"
  fi
  die "回滚也失败了，请手工处理：docker compose -f deploy/docker-compose.yml logs --tail=100 api"
fi

if [ "$AUTO_ROLLBACK" = 1 ]; then
  warn "无法自动回滚：当前运行的镜像没有 revision 标签（不是 CI 构建的），请用 --tag <上一个 commit> 手动回滚"
fi
die "更新失败，请按上面的日志排查"
