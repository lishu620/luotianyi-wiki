"# 洛天依 Wiki

虚拟歌手**洛天依**的资料站：介绍角色、管理她的歌，并把同好制作的页面整理成一套可以一键跳转的导航。

- 🌐 **前台**：首页 / 洛天依介绍 / 歌曲库 / 歌曲详情 / 同好导航 / 群聊导航 / 数据统计
- 🔐 **后台**：账号密码 + JWT 登录，管理歌曲、外链与介绍页分节
- 🔎 **搜索**：Meilisearch 优先，服务不可用时自动降级为 PostgreSQL 模糊检索
- 🌗 **主题**：浅色 / 深色跟随系统，可手动切换（主色取洛天依代表色 `#66CCFF`）

---

## 技术栈

| 层     | 选型                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| 前端   | Vue 3 + Vite + TypeScript、Element Plus + Tailwind CSS v4、Pinia、Vue Router、ECharts |
| 后端   | NestJS 11 + Fastify、TypeORM、class-validator、Passport JWT、Swagger                  |
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
├─ docker-compose.yml      # PostgreSQL + Meilisearch
└─ package.json            # 根脚本入口
```

---

## 快速开始

### 0. 环境要求

- Node.js ≥ 20.11（当前验证版本 22）
- pnpm ≥ 9（`corepack enable pnpm` 或 `npm i -g pnpm`）
- PostgreSQL 16 与 Meilisearch（见下一步，二选一）

### 1. 启动依赖服务

**方式 A：Docker（推荐）**

```bash
docker compose up -d
```

会自动创建：

| 服务        | 地址                    | 凭据                                             |
| ----------- | ----------------------- | ------------------------------------------------ |
| PostgreSQL  | `localhost:5432`        | `luotianyi` / `luotianyi`，库名 `luotianyi_wiki` |
| Meilisearch | `http://localhost:7700` | Master Key `luotianyi_dev_master_key`            |

**方式 B：一键安装本地服务（没有 Docker 时，推荐）**

无需管理员权限，全部装在仓库的 `.local/` 目录里，删掉该目录即可完全卸载。

```bash
pnpm services:setup    # 下载 PostgreSQL 二进制包与 Meilisearch，并初始化数据库
pnpm services:start    # 启动两个服务
pnpm services:stop     # 停止两个服务
```

`services:setup` 会自动完成：解压 PostgreSQL → `initdb` → 启动并创建 `luotianyi_wiki` 数据库 → 下载 Meilisearch。

**方式 C：手动安装**

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

> 没有 Meilisearch 也能跑：搜索会自动降级为 PostgreSQL 查询，后台「控制台」会显示当前引擎状态。

> 💡 出现 `Request failed with status code 500` 时，几乎都是**后端或数据库没启动**：
> 5173 端口只有前端在跑，`/api/*` 被代理到 3000 端口却无人响应，Vite 就会返回 500。
> 依次执行 `pnpm services:start` → `pnpm dev:api` → `pnpm dev:web` 即可恢复。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量（可选）

不配置也能跑，默认值与 `docker-compose.yml` 一致。

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

### 4. 写入示例数据

```bash
pnpm seed          # 首次写入（已有数据会跳过歌曲与外链）
pnpm seed:force    # 覆盖式重写歌曲与外链
```

会创建：管理员账号、6 个介绍页分节、8 首示例歌曲、12 个同好外链，并自动重建搜索索引。

> ⚠️ 示例数据中的歌曲信息与播放量为**演示用内容**，请按官方资料在后台校对后替换。

### 5. 启动开发环境

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
| `pnpm infra:up` / `pnpm infra:down`                               | 启停 Docker 依赖服务                                              |
| `pnpm services:setup`                                             | 免安装方式下载并初始化 PostgreSQL + Meilisearch（写入 `.local/`） |
| `pnpm services:start` / `pnpm services:stop`                      | 启停 `.local/` 中的 PostgreSQL 与 Meilisearch                     |
| `pnpm deploy`                                                     | 一键部署到服务器（构建 → 上传 → 重启容器 → 线上校验）             |
| `pnpm deploy:build` / `pnpm deploy:upload` / `pnpm deploy:verify` | 分步执行部署                                                      |

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
| GET  | `/api/stats`                              | 统计大屏聚合数据                                                                                            |
| GET  | `/api/search`                             | 聚合搜索（歌曲 + 外链）                                                                                     |
| GET  | `/api/search/songs` · `/api/search/links` | 分类型检索                                                                                                  |
| GET  | `/api/search/status`                      | 搜索引擎状态与索引文档数                                                                                    |
| POST | `/api/auth/login`                         | 登录，返回 JWT                                                                                              |
| POST | `/api/auth/register`                      | 自助注册，返回 JWT                                                                                          |

### 需登录（`Authorization: Bearer <token>`）

`/api/admin/songs`、`/api/admin/links`、`/api/admin/groups`、`/api/admin/profile` 的增删改查，`POST /api/search/reindex`，以及以下个人介绍接口：

| 方法    | 路径                      | 说明                                             |
| ------- | ------------------------- | ------------------------------------------------ |
| GET/PUT | `/api/cn/mine`            | 读取 / 创建更新我的个人介绍（`DELETE` 删除）     |
| GET     | `/api/cn/my-likes`        | 我对谁心动过（用户 ID 列表）                     |
| GET     | `/api/cn/bilibili-avatar` | 按 B 站 UID / 主页链接获取头像与昵称（一键同步） |
| POST    | `/api/cn/:id/like`        | 心动 / 取消心动，返回是否互相心动                |

### 权限与角色（RBAC）

- **自定义角色 + 权限矩阵**：在后台「角色权限」里自由组合权限，在「用户管理」里给用户分配角色。
- 权限按模块划分：`song` / `link` / `group` / `cn` / `profile` / `user` / `role` / `system`，动作级粒度（如 `song.update.own`、`song.update.any`、`song.approve`）。
- **归属**：歌曲 / 外链 / 群聊都有创建者；用户可发布与修改自己的内容，越权修改会被拒绝。
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

## 生产部署

已完成 Docker Compose 容器化部署，线上地址：<https://luotianyi.wiki>

完整的架构说明、运维命令与回滚步骤见 **[`deploy/README.md`](deploy/README.md)**，脚本说明见 [`scripts/deploy/README.md`](scripts/deploy/README.md)。

### 一键部署

```powershell
pnpm deploy            # 构建 → 上传 → 重建镜像 → 重启 → 线上 29 项校验
```

服务器凭据存放在 `.local/deploy/server.json`（已 gitignore）。

### 部署要点

1. **不在服务器上构建**：服务器只有 1.7GB 内存且同机跑着 MySQL，`vite build` 会触发 OOM。
   因此前端在本地构建，只上传 2.2MB 静态产物；后端本地 `tsc` 编译后只上传 0.6MB JS，服务器仅执行 `npm install --omit=dev`。
2. **复用既有 Nginx 入口**：服务器 80 端口已被一个服务于其它站点的 `nginx-proxy` 容器占用，本站不新增对外端口，只绑定 `127.0.0.1:8081` 由其反代，避免影响线上其它业务。
3. **生产关闭自动建表**：`DB_SYNCHRONIZE=false`，表结构由 `pg_dump` 导出/导入管理。
4. **密钥全部随机生成**：部署脚本会为 `JWT_SECRET`、`MEILI_MASTER_KEY`、数据库密码生成强随机值写入服务器 `.env`（该文件不纳入版本控制）。
5. **容器内存上限**：每个服务都设置了 `mem_limit`，防止某天异常增长时拖垮同机其它服务。
6. **`@luotianyi/shared` 的处理**：容器内通过 `file:./shared` 链接本地编译产物，无需发布到 npm。

### 换成自己的服务器

部署脚本里的主机信息集中在两处：

- `.local/deploy/server.json` —— SSH 主机/端口/账号/密码
- `scripts/deploy/deploy.ps1` 参数 —— `-RemoteDir`（默认 `/home/mlishu/luotianyi-wiki`）、`-Domain`

`docker-compose.yml` 与 `.env.example` 可原样复用，改 `.env` 里的域名与密码即可。

---

## 版权与免责声明

本站为**同好制作的非官方站点**，与洛天依的版权方、运营方无隶属关系。
洛天依相关的名称、形象与歌曲版权归各自权利人所有；站内数据仅用于资料整理与学习交流，如需转载或商用请自行取得授权。
"
