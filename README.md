"# 洛天依 Wiki

虚拟歌手**洛天依**的资料站：介绍角色、管理她的歌，并把同好制作的页面整理成一套可以一键跳转的导航。

- 🌐 **前台**：首页 / 洛天依介绍 / 歌曲库 / 歌曲详情 / 同好导航 / 群聊导航 / 表情广场 / 数据统计
- 🔐 **后台**：账号密码 + JWT 登录，管理歌曲、外链、群聊、表情包与介绍页分节
- 🖼️ **表情广场**：上传自动压缩为 WebP，支持分组、命名、标签、文字水印与 dHash 以图搜图
- 🔎 **搜索**：Meilisearch 优先，服务不可用时自动降级为 PostgreSQL 模糊检索
- 🌗 **主题**：浅色 / 深色跟随系统，可手动切换（主色取洛天依代表色 `#66CCFF`）
- 🚀 **部署**：本地（不需要 Docker）`pnpm dev` 开发 → push → GitHub Actions 构建镜像到 GHCR → 服务器 `bash deploy/update.sh` 一条命令更新，失败自动回滚

---

## 技术栈

| 层     | 选型                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| 前端   | Vue 3 + Vite + TypeScript、Element Plus + Tailwind CSS v4、Pinia、Vue Router、ECharts |
| 后端   | NestJS 11 + Fastify、TypeORM、class-validator、Passport JWT、Swagger                  |
| 图片   | Sharp（压缩为 WebP、SVG 文字水印、dHash 感知哈希）                                    |
| 数据库 | PostgreSQL 16                                                                         |
| 搜索   | Meilisearch                                                                           |
| 工程   | pnpm workspace（monorepo）+ 共享类型包                                                |

```
luotianyi-wiki/
├─ apps/
│  ├─ api/                 # NestJS + Fastify 后端
│  └─ web/                 # Vue3 + Vite 前端
├─ packages/
│  └─ shared/              # 前后端共享的领域模型 / 枚举 / 常量
├─ deploy/                 # 服务器部署：compose / Dockerfile / deploy.sh / update.sh
├─ docker-compose.yml      # 本地开发用的依赖服务（可选，见「本地开发」）
└─ package.json            # 根脚本入口
```

---

## 本地开发（不需要 Docker）

本地只需要 Node.js + pnpm：PostgreSQL 与 Meilisearch 由脚本下载到仓库 `.local/` 目录（无需管理员权限），
镜像构建与容器运行全部交给 GitHub Actions 与服务器。**本地改代码 → 自检 → push，服务器上一条命令更新**（见「[部署与更新](#部署与更新)」）。

### 1. 环境要求

- Node.js ≥ 20.11（当前验证版本 22）
- pnpm ≥ 9（`corepack enable pnpm` 或 `npm i -g pnpm`）
- 给 `.local/` 预留约 1GB 磁盘（PostgreSQL 二进制包 + Meilisearch）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 一键准备本地依赖服务（PostgreSQL + Meilisearch）

无需管理员权限，全部装在仓库的 `.local/` 目录里，删掉该目录即可完全卸载。

```bash
pnpm services:setup    # 首次执行：下载 PostgreSQL 二进制包与 Meilisearch，并初始化数据库
pnpm services:start    # 每次开始开发前启动（已在运行会自动跳过）
pnpm services:stop     # 停止这两个服务
```

`services:setup` 会自动完成：解压 PostgreSQL → `initdb` → 启动并创建 `luotianyi_wiki` 数据库 → 下载 Meilisearch。

| 服务        | 地址                    | 凭据                                             |
| ----------- | ----------------------- | ------------------------------------------------ |
| PostgreSQL  | `127.0.0.1:5432`        | `luotianyi` / `luotianyi`，库名 `luotianyi_wiki` |
| Meilisearch | `http://127.0.0.1:7700` | Master Key `luotianyi_dev_master_key`            |

> 没有 Meilisearch 也能跑：搜索会自动降级为 PostgreSQL 查询，后台「控制台」会显示当前引擎状态。

### 4. 配置环境变量（可选）

不配置也能跑：代码内置的默认值（`127.0.0.1:5432` / `127.0.0.1:7700`，见 `apps/api/src/config/configuration.ts`）就是上面这套本地服务。

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

关键变量（`apps/api/.env`）：

| 变量                                                | 默认值                           | 说明                                 |
| --------------------------------------------------- | -------------------------------- | ------------------------------------ |
| `API_PORT`                                          | `3000`                           | 后端端口                             |
| `CORS_ORIGINS`                                      | `http://localhost:5173`          | 允许的前端来源，逗号分隔             |
| `DB_*`                                              | 见文件                           | PostgreSQL 连接信息                  |
| `DB_SYNCHRONIZE`                                    | `true`                           | 开发期自动建表，**生产请设为 false** |
| `JWT_SECRET`                                        | `luotianyi-dev-secret-change-me` | **上线前务必替换**                   |
| `MEILI_ENABLED` / `MEILI_HOST` / `MEILI_MASTER_KEY` | —                                | Meilisearch 配置                     |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD`                 | `admin` / `luotianyi2026`        | 执行 seed 时创建的管理员             |

### 5. 写入示例数据

```bash
pnpm seed          # 首次写入（已有数据会跳过歌曲与外链）
pnpm seed:force    # 覆盖式重写歌曲与外链
```

会创建：管理员账号、6 个介绍页分节、8 首示例歌曲、12 个同好外链，并自动重建搜索索引。

> ⚠️ 示例数据中的歌曲信息与播放量为**演示用内容**，请按官方资料在后台校对后替换。

### 6. 启动开发环境

```bash
pnpm dev           # 同时启动前后端
```

|              | 地址                                                           |
| ------------ | -------------------------------------------------------------- |
| 前端         | http://localhost:5173                                          |
| 后端         | http://localhost:3000/api                                      |
| Swagger 文档 | http://localhost:3000/api/docs                                 |
| 后台管理     | http://localhost:5173/admin （登录 `admin` / `luotianyi2026`） |

也可以分开启动：

```bash
pnpm dev:api       # 仅后端（nest --watch）
pnpm dev:web       # 仅前端（vite）
```

> 💡 出现 `Request failed with status code 500` 时，几乎都是**后端或数据库没启动**：
> 5173 端口只有前端在跑，`/api/*` 被代理到 3000 端口却无人响应，Vite 就会返回 500。
> 依次执行 `pnpm services:start` → `pnpm dev` 即可恢复（`pnpm dev` 会同时启动前后端）。

### 7. 提交前自检

CI（[`.github/workflows/build-images.yml`](.github/workflows/build-images.yml)）会对每个 PR 与 `main` 提交跑同样两项，先在本地跑一遍能省一次往返：

```bash
pnpm typecheck
pnpm build
```

### 可选：依赖服务改用 Docker

本机装了 Docker 时也可以用它起依赖服务（容器名是 `lty-dev-*`，与服务器上的 `lty-*` 不会互相影响）：

```bash
pnpm infra:up      # = docker compose up -d（PostgreSQL + Meilisearch）
pnpm infra:down
```

### 手动安装依赖服务

不想用 `pnpm services:setup` 时，也可以自己装 PostgreSQL 16 与 Meilisearch：

1. 安装 PostgreSQL 16 并创建库与用户：

   ```sql
   CREATE USER luotianyi WITH PASSWORD 'luotianyi';
   CREATE DATABASE luotianyi_wiki OWNER luotianyi;
   ```

2. 安装 Meilisearch：从 [Meilisearch 官网](https://www.meilisearch.com/docs/learn/getting_started/installation) 下载 Windows 版并运行：

   ```powershell
   .\meilisearch.exe --master-key luotianyi_dev_master_key
   ```

3. 按实际情况修改 `apps/api/.env`。

---

## 常用脚本

在**仓库根目录**执行：

| 命令                                                              | 作用                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                                                        | 并行启动前后端（会先构建 shared）                                 |
| `pnpm build`                                                      | 构建 shared → api → web                                           |
| `pnpm typecheck`                                                  | 全量类型检查                                                      |
| `pnpm seed` / `pnpm seed:force`                                   | 写入 / 覆盖示例数据                                               |
| `pnpm reindex`                                                    | 重建 Meilisearch 全量索引                                         |
| `pnpm infra:up` / `pnpm infra:down`                               | 启停 Docker 依赖服务（本机装了 Docker 时，容器名 `lty-dev-*`）     |
| `pnpm services:setup`                                             | 免安装方式下载并初始化 PostgreSQL + Meilisearch（写入 `.local/`） |
| `pnpm services:start` / `pnpm services:stop`                      | 启停 `.local/` 中的 PostgreSQL 与 Meilisearch                     |

**服务器上执行**（不在本地跑，完整流程见「[部署与更新](#部署与更新)」）：

| 命令                                   | 作用                                          |
| -------------------------------------- | --------------------------------------------- |
| `bash deploy/deploy.sh --prebuilt`     | 首次部署 / 需要全量重建时                      |
| `bash deploy/update.sh`                | 日常更新（pull 代码 → 拉镜像 → 重建 → 健康检查） |
| `bash deploy/update.sh --tag <commit>` | 更新 / 回滚到指定提交                          |

> 另外还有一套**备用**的「本地构建 + 上传」部署脚本，走 SSH 直传产物、不依赖 GitHub Actions：
> `pnpm deploy` / `pnpm deploy:build` / `pnpm deploy:upload` / `pnpm deploy:verify`，见 [`scripts/deploy/README.md`](scripts/deploy/README.md)。

---

## 主要接口

统一响应格式：`{ "code": 0, "message": "ok", "data": ... }`

### 公开接口

| 方法 | 路径                                      | 说明                                                                                                        |
| ---- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| GET  | `/api/songs`                              | 歌曲分页列表（`keyword`/`year`/`tag`/`vocalType`/`producer`/`featured`/`sortBy`/`order`/`page`/`pageSize`） |
| GET  | `/api/songs/featured`                     | 代表作                                                                                                      |
| GET  | `/api/songs/filters`                      | 筛选项（年份 / P 主 / 标签及数量）                                                                          |
| GET  | `/api/songs/:id`                          | 歌曲详情                                                                                                    |
| GET  | `/api/songs/:id/related`                  | 相关推荐                                                                                                    |
| GET  | `/api/profile`                            | 介绍页全部分节                                                                                              |
| GET  | `/api/profile/:slug`                      | 单个分节                                                                                                    |
| GET  | `/api/links`                              | 外链分页列表                                                                                                |
| GET  | `/api/links/grouped`                      | 按分类分组（导航页）                                                                                        |
| POST | `/api/links/:id/click`                    | 记录一次跳转                                                                                                |
| GET  | `/api/groups`                             | 群聊分页列表（`keyword`/`section`/`page`/`pageSize`）                                                       |
| GET  | `/api/groups/grouped`                     | 按栏目分组（群聊导航页）                                                                                    |
| GET  | `/api/groups/sections`                    | 各栏目群聊数量                                                                                              |
| GET  | `/api/groups/:id`                         | 群聊详情                                                                                                    |
| GET  | `/api/cn`                                 | 同好广场列表（`keyword`/`interest`/`region`/`gender`/`purpose`/`sort`/`page`/`pageSize`）                   |
| GET  | `/api/cn/heart`                           | 兴趣推荐（按标签重合度）                                                                                    |
| GET  | `/api/cn/filters`                         | 广场筛选项（热门兴趣 / 地区）                                                                               |
| GET  | `/api/cn/:id`                             | 个人介绍详情（联系方式需互相心动才返回）                                                                    |
| GET  | `/api/emoji/packs`                        | 表情包分页列表（`keyword`/`category`/`sortBy`/`order`/`page`/`pageSize`）                                   |
| GET  | `/api/emoji/packs/:id`                    | 表情包详情（含全部表情）                                                                                    |
| GET  | `/api/emoji/categories` · `/api/emoji/stats` | 分类数量 / 表情包与表情总数                                                                              |
| POST | `/api/emoji/search/image`                 | 以图搜图（`multipart/form-data`，字段 `file`），返回相似表情与所属表情包                                    |
| GET  | `/api/stats`                              | 统计大屏聚合数据                                                                                            |
| GET  | `/api/search`                             | 聚合搜索（歌曲 + 外链）                                                                                     |
| GET  | `/api/search/songs` · `/api/search/links` | 分类型检索                                                                                                  |
| GET  | `/api/search/status`                      | 搜索引擎状态与索引文档数                                                                                    |
| POST | `/api/auth/login`                         | 登录，返回 JWT                                                                                              |
| POST | `/api/auth/register`                      | 自助注册，返回 JWT                                                                                          |

### 需登录（`Authorization: Bearer <token>`）

`/api/admin/songs`、`/api/admin/links`、`/api/admin/groups`、`/api/admin/emoji`、`/api/admin/profile` 的增删改查，`POST /api/search/reindex`，以及以下个人介绍接口：

| 方法    | 路径                      | 说明                                             |
| ------- | ------------------------- | ------------------------------------------------ |
| GET/PUT | `/api/cn/mine`            | 读取 / 创建更新我的个人介绍（`DELETE` 删除）     |
| GET     | `/api/cn/my-likes`        | 我对谁心动过（用户 ID 列表）                     |
| GET     | `/api/cn/bilibili-avatar` | 按 B 站 UID / 主页链接获取头像与昵称（一键同步） |
| POST    | `/api/cn/:id/like`        | 心动 / 取消心动，返回是否互相心动                |

### 权限与角色（RBAC）

- **自定义角色 + 权限矩阵**：在后台「角色权限」里自由组合权限，在「用户管理」里给用户分配角色。
- 权限按模块划分：`song` / `link` / `group` / `emoji` / `cn` / `profile` / `user` / `role` / `system`，动作级粒度（如 `song.update.own`、`song.update.any`、`song.approve`）。
- **归属**：歌曲 / 外链 / 群聊 / 表情包都有创建者；用户可发布与修改自己的内容，越权修改会被拒绝。
- **注册用户默认权限**：`emoji.create` / `emoji.update.own` / `emoji.delete.own`，登录后即可创建并管理自己的表情包。
- **歌曲修改审批**：非本人编辑歌曲 → 生成「修改申请」，由原投稿人或有 `song.approve` 权限的管理员在「修改申请」中通过/驳回，通过后自动写回歌曲。
- 内置「超级管理员」角色（`*` 全部权限，不可删除）；预设「站点管理员 / 内容编辑 / 投稿用户」可直接使用。

| 方法     | 路径                                  | 说明                                                             |
| -------- | ------------------------------------- | ---------------------------------------------------------------- |
| GET/POST | `/api/admin/users`                    | 用户列表 / 新增（`PATCH`、`DELETE`、`POST :id/reset-password`）  |
| GET/POST | `/api/admin/roles`                    | 角色与权限矩阵（`PATCH`、`DELETE`）                              |
| GET      | `/api/admin/song-requests`            | 歌曲修改申请（`POST :id/approve`、`POST :id/reject`）            |
| POST     | `/api/admin/songs/:id/change-request` | 提交歌曲修改申请                                                 |
| GET      | `/api/admin/cn`                       | 个人介绍列表（`PATCH :id/status` 展示或隐藏、`DELETE :id` 删除） |

完整字段说明见 Swagger：<http://localhost:3000/api/docs>

---

## CN 个人介绍（可选的扩列）

「先做个人介绍，再决定要不要扩列」——每位登录用户可以编写一张个人介绍卡（圈名 CN / 头像 / 性格 / 兴趣标签 / 自我介绍），并选择用途：

| 用途   | 值                | 行为                                                 |
| ------ | ----------------- | ---------------------------------------------------- |
| 仅展示 | `display`（默认） | 仅展示个人介绍，不显示「心动」按钮，不参与扩列       |
| 想扩列 | `friends`         | 可在同好广场被「心动」；开启「想找的搭子」与联系方式 |

- **同好广场 `/cn`**：搜索圈名 / 自我介绍 / 兴趣，或用兴趣、地区、性别、用途筛选；排序支持 最新 / 活跃 / 随机 / 心动推荐。
- **B 站头像**：填 B 站 UID 或主页链接后点「用 B 站头像」一键同步（后端走 `GET /api/cn/bilibili-avatar`，带 `buvid3` 绕风控 + 10 分钟内存缓存）；保存时若头像为空会自动补拉。
- **卡面款式**：`cardStyle` 可选 天依蓝 `classic`（默认）/ 樱花粉 `sakura` / 午夜星 `midnight` / 薄荷绿 `mint` / 落日橙 `sunset` / 极简白 `mono`，页面卡片与导出图片共用同一套配色 token（`apps/web/src/utils/cnCardThemes.ts`）。
- **联系方式保护**：`contacts` 仅在「双方互相心动」、本人或拥有 `cn.manage` 权限时返回，否则为空对象且 `contactsVisible=false`。
- **导出图片**：前端 Canvas 纯客户端渲染 1080 宽（2x 高清）的 PNG，按所选款式取色，无需服务器参与。
- **移动端**：广场与卡片采用 1 / 2 / 3 列自适应栅格，表单与预览在窄屏自动上下堆叠。

---

## 表情广场

「表情广场」用来收集与洛天依相关的表情包。前台 `/emoji` 浏览、筛选与以图搜图；登录后可在 `/admin/emoji` 创建表情包并上传表情。

- **压缩存储**：上传的 JPG / PNG / WebP / GIF / AVIF / TIFF 会经 Sharp 统一转为 WebP，最长边默认 1080px、质量 82，动图保留全部帧。
- **管理能力**：表情包分组（分类 / 标签）、改名、排序、设为封面、批量删除；单张表情可重命名、改标签、调排序、删除。
- **水印**：可选文字水印，支持 5 个位置与不透明度。系统同时保留「无水印底图」和「展示图」，因此可以随时更换或移除水印，不会反复压缩导致画质下降。
- **以图搜图**：所有表情在入库时计算 64 位 dHash；搜索时把查询图按同样规则压缩后计算哈希，与已发布表情比对汉明距离，按表情包聚合返回最相似结果。全程本地计算，不调用第三方服务。
- **权限与隔离**：公开接口只返回 `published` 表情包；注册用户默认只能看到和管理自己创建的表情包，拥有 `emoji.update.any` / `emoji.delete.any` 的管理员可管理全部内容。
- **升级提示**：从旧版本升级后执行一次 `pnpm seed`（生产：`docker compose -f deploy/docker-compose.yml exec -T api node dist/database/seed.js`）即可给内置预设角色补齐 `emoji.*` 权限；也可以在后台「角色权限」里手动勾选。
- **存储位置**：本地开发默认 `apps/api/uploads/`；生产环境通过 `UPLOAD_DIR=/app/uploads` 挂载到 Docker 持久卷 `uploads-data`。以下环境变量可调：

| 变量                        | 默认值  | 说明                                 |
| --------------------------- | ------- | ------------------------------------ |
| `UPLOAD_DIR`                | `uploads` | 图片存储根目录（相对后端工作目录） |
| `UPLOAD_MAX_MB`             | `12`      | 单张图片最大体积                   |
| `EMOJI_MAX_DIMENSION`       | `1080`    | 压缩后最长边（128–2048）           |
| `EMOJI_WEBP_QUALITY`        | `82`      | WebP 质量（40–100）                |
| `EMOJI_SEARCH_MAX_DISTANCE` | `12`      | 以图搜图最大汉明距离（0–64）       |

---

## 搜索降级策略

```
请求 /api/search/*
        │
        ├─ Meilisearch 可用 → 使用索引检索（带过滤与排序）
        │
        └─ 不可用 / 报错 / 未启动 → 自动回退 PostgreSQL ILIKE 检索（标题 / 拼音 / 别名 / P 主 / 标签）
```

后台「控制台」可查看当前引擎，并一键重建索引。命令行重建：`pnpm reindex`。

---

## 数据模型

| 表                     | 说明                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `users`                | 管理员账号（bcrypt 哈希）                                                                                                      |
| `songs`                | 歌曲：标题 / 拼音 / 别名 / 创作人员 / 演唱形式 / 发行信息 / 播放量 / 标签 / 多平台链接 / 代表作与状态                          |
| `external_links`       | 同好站点：名称 / 地址 / 分类 / 图标 / 标签 / 推荐位 / 排序 / 点击量                                                            |
| `community_groups`     | 中V群聊导航：群名 / QQ 群号 / 栏目 / 活跃度 / 备注 / 排序 / 状态                                                               |
| `cn_profiles`          | 个人介绍卡：圈名 / 头像 / B 站 UID / 卡面款式 / 性别 / 年龄 / 地区 / 性格 / 兴趣标签 / 想找的搭子 / 用途 / 联系方式 / 展示状态 |
| `cn_likes`             | 心动关系：`fromUserId` → `toUserId`，唯一约束，互为记录即「互相心动」                                                          |
| `emoji_packs`          | 表情包：名称 / 分类 / 标签 / 封面 / 状态 / 水印默认配置 / 归属人 / 排序                                                        |
| `emoji_images`         | 表情：所属表情包 / 名称 / 标签 / 底图与展示图路径 / 尺寸 / 体积 / dHash / 水印文字 / 排序                                      |
| `roles`                | 自定义角色：名称 / 描述 / 权限矩阵（`'*'` 为全部权限）/ 是否内置                                                               |
| `song_change_requests` | 歌曲修改申请：目标歌曲 / 申请人 / 变更内容 / 原因 / 审批状态与结论                                                             |
| `profile_sections`     | 介绍页分节：`hero`、`basic`、`story`、`voice`、`gallery`、`achievement`，含 Markdown 正文与 JSON 结构化数据                    |

介绍页分节的 `data` 字段支持三种结构：

```jsonc
{
  "facts": [{ "label": "代表色", "value": "#66CCFF" }],
  "gallery": [
    { "name": "初始造型", "imageUrl": "https://...", "description": "说明" },
  ],
  "timeline": [{ "year": "2012", "title": "正式亮相", "description": "描述" }],
}
```

---

## 部署与更新

线上地址：<https://luotianyi.wiki>（宿主机 Nginx / Cloudflare → 回环 :8081 → 本站 web 容器）。

### 职责分离：本地只开发，服务器只运行

```
① 本地开发                ② git push       ③ GitHub Actions                 ④ 服务器
pnpm dev（无 Docker） ─────────────────► 校验 → 构建 api/web 镜像 → GHCR ──► bash deploy/update.sh
                                          （自动，无需任何密钥）              （拉镜像 → 重建容器）
```

- **本地**：只写代码、只跑 `pnpm dev`，不需要 Docker，也不需要服务器凭据。
- **GitHub Actions**：每个 `main` 提交自动校验（`typecheck` + `build`）并构建镜像推到 GHCR，标签为 `latest` 与 `<commit-sha>`。
- **服务器**：只 `docker pull` 已经构建好的镜像并重建容器，不在自己机器上构建前端/后端（1.7G 内存的小机器也够用）。
- 服务器在内网也没关系：**由服务器主动拉取**，GitHub 不需要能连上服务器。

### 首次部署（新服务器，只做一次）

前置：服务器装好 Docker 与 compose 插件，能访问 github.com 与 ghcr.io，且该提交已有一次成功的 CI 构建
（GitHub → Actions 里「CI（校验 → 构建并推送镜像）」变绿，或手动 Run workflow 触发一次）。

```bash
git clone https://github.com/lishu620/luotianyi-wiki.git
cd luotianyi-wiki
bash deploy/deploy.sh --prebuilt
```

脚本依次完成：生成 `deploy/.env`（随机密钥）→ 拉取镜像 → 启动 `postgres / meilisearch / api / web` → 等待后端就绪 → 写入示例数据 → 打印访问地址与后台账号口令。

宿主 80 端口已被其它服务占用时（本站线上就是这么跑的）：

```bash
WEB_BIND_IP=127.0.0.1 WEB_HOST_PORT=8081 bash deploy/deploy.sh --prebuilt
```

脚本会把这两个变量写回 `deploy/.env`，后续 `bash deploy/update.sh` 自动沿用，**不需要每次重新传**。
若 `.env` 是旧版本生成的（缺少这两项），手动补一次即可：

```bash
printf 'WEB_BIND_IP=127.0.0.1\nWEB_HOST_PORT=8081\n' >> deploy/.env
```

否则重建容器会退回 `0.0.0.0:80`，在宿主机已占用 80 的机器上报 `failed to bind host port 0.0.0.0:80/tcp: address already in use`。

### 更新线上（日常流程）

四步：本地自检 → push → 等 CI 变绿 → 服务器一条命令。

```bash
# ① 本地：改完代码先自检（CI 跑的是同样两项，本地先跑一遍省一次往返）
pnpm typecheck
pnpm build

# ② 提交并推送
git add -A
git commit -m "feat: ..."
git push

# ③ 等 CI 变绿：GitHub → Actions 页面，或本地执行 gh run watch

# ④ 服务器：一条命令更新
ssh <服务器>
cd /home/mlishu/luotianyi-wiki
bash deploy/update.sh
```

`update.sh` 依次做：`git pull` → 解析这次提交对应的镜像版本 → `docker compose pull` → 重建 `api` / `web` → 等后端就绪 → 检查首页与 `/api` 反代 → **任一步失败自动回滚到上一个版本**。

| 命令                                   | 作用                                                  |
| -------------------------------------- | ----------------------------------------------------- |
| `bash deploy/update.sh`                | 更新到当前代码对应的版本（日常用这个）                |
| `bash deploy/update.sh --tag latest`   | 更新到 CI 最近一次构建的镜像（不跟随提交）            |
| `bash deploy/update.sh --tag <sha>`    | 更新 / 回滚到指定提交                                 |
| `bash deploy/update.sh --list`         | 列出最近几个提交，以及对应镜像是否已发布              |
| `bash deploy/update.sh --no-pull-code` | 不动代码，只按 `deploy/.env` 里的版本重建容器         |
| `bash deploy/update.sh --verify`       | 更新后再跑一遍全站校验（29 项断言，需服务器有 python3） |
| `bash deploy/update.sh --no-rollback`  | 失败时不自动回滚（排查问题时用）                      |

### 回滚

镜像标签就是提交号，所以回滚只是换一个版本号（镜像仍在 GHCR 上，秒级完成）：

```bash
git log --oneline -10                        # 找到要回滚到的提交
bash deploy/update.sh --tag <commit-sha>
```

### 备用：不走 GitHub，本地构建 + 上传

服务器不便访问 GitHub / GHCR 时，可以用 `pnpm deploy`（本地构建产物 → SSH 上传 → 服务器重建容器 → 线上校验）。
这不是日常流程，细节见 [`scripts/deploy/README.md`](scripts/deploy/README.md)。

### 更多运维内容

架构图、忘记后台口令、服务器内存紧张时的处理等，见 **[`deploy/README.md`](deploy/README.md)**。

### `deploy.sh` 常用参数与环境变量

> 日常更新用 `update.sh`（参数见上一节）；`deploy.sh` 用于首次部署 / 需要全量重建时。

| 参数 / 变量                         | 说明                                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--prebuilt`                        | 不在服务器构建，`docker compose pull` + `up -d --no-build`（首次部署推荐）                                                                          |
| `--no-cache`                        | 全量重建镜像（与 `--prebuilt` 互斥）                                                                                                                |
| `--skip-seed`                       | 不写入示例数据                                                                                                                                      |
| `--regen-env`                       | 重新生成 `.env`（⚠️ 会换数据库密码，需先 `docker compose down -v`）                                                                                 |
| `WEB_HOST_PORT`                     | 对外端口，默认 `80`                                                                                                                                 |
| `WEB_BIND_IP`                       | 绑定的网卡，默认 `0.0.0.0`；宿主 80 被占用时用 `WEB_BIND_IP=127.0.0.1 WEB_HOST_PORT=8081` 只绑回环（会写回 `deploy/.env`）                            |
| `IMAGE_PREFIX` / `IMAGE_TAG`        | 镜像来源与版本，默认 `ghcr.io/lishu620/luotianyi-wiki-*:latest`；国内拉取慢可设 `IMAGE_PREFIX=docker.m.daocloud.io/ghcr.io/lishu620/luotianyi-wiki` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 后台账号，默认 `admin` + 随机口令（部署结尾打印）；要固定就显式传入                                                                                 |

> `update.sh` 会把当前版本写回 `deploy/.env` 的 `IMAGE_TAG`，所以之后任何 `docker compose up -d` 都只会用这个版本；
> 想重新跟随 CI 的最新镜像，执行 `bash deploy/update.sh --tag latest`。

### 部署要点

1. **容器名固定为 `lty-*`**：同一台机器只能跑一套；换目录重建前先 `docker compose down`。（本地 Docker 依赖服务用的是 `lty-dev-*`，两者不会互相影响。）
2. **密钥全部随机生成**：`JWT_SECRET`、`MEILI_MASTER_KEY`、数据库密码由脚本随机生成写入 `deploy/.env`（不纳入版本控制）。
3. **`deploy/.env` 里的 `IMAGE_TAG` = 当前线上版本**：`deploy.sh` / `update.sh` 都会写回，重启容器不会悄悄换版本。
4. **`DB_SYNCHRONIZE=true`**：由 TypeORM 自动建表/加列，无需手工 migration；若改由 dump 管理表结构，置 `false` 并自行导入。
5. **容器内存上限**：每个服务都设了 `mem_limit`（meilisearch 为 512m —— 256m 会因容器内存上限被 OOM 重启；api 为 480m 以容纳 Sharp 图片处理）。
6. **表情图片持久化**：生产环境把 `uploads-data` 卷挂载到 api 容器的 `/app/uploads`；`docker compose down -v` 会连同数据库与表情图片一起删除，操作前注意备份。
7. **`@luotianyi/shared` 的处理**：容器内通过 `file:./shared` 链接本地编译产物，无需发布到 npm。
8. **`update.sh` 找不到镜像**：说明那次提交只改了文档（CI 按路径过滤，不会构建镜像），脚本会自动往前找最近的可用版本；如果是 CI 还在构建，脚本会重试 6 次 × 20 秒，仍失败就等 Actions 变绿后再执行。
9. **服务器内存紧张时**：别在服务器上构建（不要用不带 `--prebuilt` 的 `deploy.sh`）；确实要在服务器构建时，先 `docker compose -f deploy/docker-compose.yml stop` 再执行。

---

## 版权与免责声明

本站为**同好制作的非官方站点**，与洛天依的版权方、运营方无隶属关系。
洛天依相关的名称、形象与歌曲版权归各自权利人所有；站内数据仅用于资料整理与学习交流，如需转载或商用请自行取得授权。
"
