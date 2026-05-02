# 「学栖」校园学习社区平台 — 技术文档

> 版本：v4.2.0 | 最后更新：2026-05-02

---

## 一、项目概述

「学栖」是一个面向大学生的**校园学习社区平台**，融合虚拟自习室、实体占座、社区讨论、积分排行、好友私聊等核心功能。整体 UI 风格为**古典中国风 × 书院气质**，配合毛玻璃效果与水墨装饰。

### 核心功能模块

| 模块         | 功能点                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **书院**     | 虚拟自习室、面对面聊天（输入房间号自动创建临时房间）、实时群聊（含匿名/表情/图片）、番茄钟、学习计时、状态同步、沉浸模式、环境音混合器、空闲用户自动踢出 |
| **云占座**   | 实体座位预约、座位图可视化、签到、违约惩罚（20 分钟超时自动释放）、志愿任务减免                                                           |
| **知识广场** | 帖子/评论、Markdown 编辑器（图片上传/拖拽/粘贴）、@提及自动补全、匿名发布、点赞/收藏、编辑提案、版本管理                                  |
| **金榜**     | 积分/学习时长/签到/周榜/月榜 五维排行                                                                                                     |
| **好友系统** | 申请/接受/拒绝、拉黑、私聊（仅好友，支持图片/表情）、实时在线状态                                                                         |
| **关注系统** | 关注/粉丝、个人主页 `/user/:id`、用户资料卡弹窗                                                                                           |
| **管理后台** | 文章管理（分类/作者/状态/关键词筛选）、评论管理、用户管理、座位管理、反馈管理、志愿者审核、审核日志、系统统计（ECharts 图表）、敏感词管理、登录日志 |
| **安全增强** | 管理员独立登录入口（`/BFAY`，普通登录拦截管理员）、管理员登录审计日志、管理员短 Token（accessToken 5min + refreshToken 1d）、修改密码 |

### 技术要求满足情况

- **多服务协同**：3 个独立微服务 + API 网关
- **容器部署**：Docker Compose 编排 7 个容器（非 root 运行）
- **用户管理**：注册/登录/登出/信息修改 + JWT 双 Token + RBAC（超级管理员/管理员/用户三级）
- **数据持久化**：MySQL 8.0 关系型数据库（utf8mb4）+ Redis 7-alpine 缓存（AOF 持久化 + 密码认证）
- **安全加固**：CORS 域名白名单、CSP/HSTS 安全响应头、httpOnly Cookie、Redis fail-closed、账户锁定、验证码、密码环境变量必填、Service Token 角色降级、管理员独立登录+审计日志、短 Token
- **内容安全**：DFA 敏感词过滤（全服务覆盖）、输入预处理（大小写/全角/繁简/特殊字符对抗）、126 条预设敏感词

---

## 二、技术栈

| 层级      | 技术                                                                                 | 版本 |
| --------- | ------------------------------------------------------------------------------------ | ---- |
| 前端框架  | Vue 3 (Composition API) + Vite 6 + Pinia 3 + Vue Router 4                            | 3.x  |
| UI 组件库 | Element Plus                                                                         | 最新 |
| 实时通信  | Socket.IO（聊天、状态同步、座位更新、在线状态、好友事件）                            | 4.8  |
| 动画      | GSAP + ScrollTrigger（首页长翻页、滚动渐入）                                         | 3.12 |
| 后端框架  | Node.js 24 + Express 5（3 个微服务 + API 网关）                                      | 5.x  |
| 共享模块  | `xueqi-shared`（DB、Redis、JWT、日志、错误处理、响应格式、敏感词过滤、限流、验证码） | —    |
| 数据库    | MySQL 8.0（utf8mb4，20 连接池）                                                      | 8.0  |
| 缓存      | Redis 7-alpine（ioredis，AOF 持久化，密码认证）                                      | 7.x  |
| 认证      | JWT (jsonwebtoken) + bcryptjs（accessToken 用户15min/管理员5min + refreshToken 用户7d/管理员1d，httpOnly Cookie） | —    |
| 文件上传  | Multer（头像/文章图片/聊天图片）                                                     | —    |
| Markdown  | marked + DOMPurify + highlight.js（渲染 + 安全过滤 + 代码高亮）                      | —    |
| 图表      | ECharts 6（管理后台统计图表）                                                        | 6.x  |
| 部署      | Docker Compose（7 容器）+ Nginx（反向代理 + 静态资源）                               | —    |

---

## 三、系统架构

```
浏览器 ──→ Nginx(:80/:443) ──→ API网关(:3000) ──┬──→ 用户服务(:3001)
         │                                      ├──→ 学习内容服务(:3002) ← Socket.IO
         │                                      └──→ 社区服务(:3003)
         │                                             │
         │                            ┌────────────────┴────────────────┐
         │                            │     MySQL 8.0(:3306)            │
         │                            │     Redis 7-alpine(:6379)      │
         │                            └────────────────────────────────┘
         │
         ├── /socket.io/* ──→ 学习内容服务 (WebSocket, 24h 超时)
         ├── /uploads/*   ──→ 共享卷静态文件 (7 天缓存)
         └── /*           ──→ Vue SPA (index.html, 不缓存)
```

### 服务职责

| 服务             | 端口 | 职责                                                                                |
| ---------------- | ---- | ----------------------------------------------------------------------------------- |
| **Nginx**        | 80   | 静态资源服务、反向代理（API + WebSocket）、安全头、上传文件服务、限流 30r/s         |
| **API 网关**     | 3000 | 路由转发、CORS 白名单、安全响应头、全局限流 500req/15min、认证限流 50req/15min      |
| **用户服务**     | 3001 | 注册/登录/JWT/RBAC、用户信息、积分/等级/排行榜、通知、好友/关注/拉黑、头像上传      |
| **学习内容服务** | 3002 | 虚拟自习室、实体占座、番茄钟、学习记录、Socket.IO 服务端、群聊、私聊                |
| **社区服务**     | 3003 | 帖子/评论、点赞/收藏、标签、@提及解析与通知、匿名、审核管理、编辑提案、文章图片上传 |

---

## 四、项目目录结构

```
D:\web\
├── docker-compose.yml          # 容器编排 (7 容器)
├── docker-compose.prod.yml     # 生产环境覆盖（HTTPS、隐藏端口、NODE_ENV）
├── docker-compose.test.yml     # 本地模拟测试覆盖（自签名证书）
├── .env                        # 生产环境变量
├── .env.example                # 环境变量模板
├── .dockerignore               # Docker 构建排除
├── 技术文档.md                  # 本文档
│
├── database/
│   └── init/
│       ├── 01-schema.sql       # 核心表结构 (27 张表)
│       ├── 02-seed.sql         # 种子数据 (角色/等级/用户/自习室/座位/标签/帖子)
│       ├── 03-indexes.sql      # 复合索引优化 (17 个)
│       ├── 04-private-chat.sql # 私聊表 (conversations, private_messages)
│       ├── 05-migration-v2.5.sql # v2.5 迁移 (废弃书籍表)
│       ├── 06-friend-system.sql # 好友系统表 (friend_requests, friendships, blocks)
│       ├── 07-user-follows.sql # 关注系统表 + follower/following 计数字段
│       ├── 08-account-id.sql   # account_id 迁移 (自动生成唯一六位 ID)
│       ├── 09-sensitive-words.sql # 敏感词表
│       ├── 10-reports.sql      # 举报表
│       ├── 11-sensitive-words-seed.sql # 敏感词种子数据 (126 条)
│       └── 12-admin-login-logs.sql # 管理员登录日志表
│
├── services/
│   ├── shared/                 # xueqi-shared 共享模块
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js        # 统一导出
│   │       ├── db.js           # MySQL2 连接池 (20 connections, utf8mb4, 密码必填)
│   │       ├── redis.js        # ioredis (密码认证, retry 策略, max 5s backoff)
│   │       ├── jwt.js          # generateToken / generateRefreshToken / verifyToken
│   │       ├── auth.js         # 4 个认证中间件 (详见认证章节)
│   │       ├── logger.js       # Winston JSON logger (colorize + timestamp)
│   │       ├── responseHandler.js  # res.success() / res.error() / res.paginate()
│   │       ├── errorHandler.js # 全局错误处理 (详见错误处理章节)
│   │       ├── sensitiveFilter.js  # DFA 敏感词过滤 (预处理 + 替换/阻止模式 + 增量更新)
│   │       ├── rateLimiter.js      # 限流工具
│   │       └── captcha.js          # 图形验证码生成/校验
│   │
│   ├── api-gateway/
│   │   ├── Dockerfile          # node:24-alpine + su-exec 非 root
│   │   ├── package.json
│   │   └── src/app.js          # http-proxy-middleware 反向代理 + 限流 + CORS 白名单 + 安全头
│   │
│   ├── user-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── app.js          # Express 服务入口 (路由挂载、CORS 白名单、敏感词加载)
│   │       ├── routes/         # auth, profile, upload, points, notifications, friends, follows, admin, feedback
│   │       ├── controllers/    # 各路由对应控制器
│   │       └── services/       # authService, userService, pointsService, adminService 等
│   │
│   ├── study-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── app.js          # Express + Socket.IO 服务端 (敏感词加载)
│   │       ├── socket.js       # Socket.IO 事件处理器 (541 行, 33 个事件, 聊天/私信敏感词替换)
│   │       ├── routes/         # rooms, sessions, locations, seats, volunteer, chat, privateChat
│   │       ├── controllers/
│   │       └── services/       # roomService, sessionService, seatService, chatService, privateChatService 等
│   │
│   └── community-service/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           ├── app.js
│           ├── routes/         # posts, comments, tags, proposals, bookmarks, admin, upload
│           ├── controllers/
│           └── services/       # postService, commentService, bookmarkService, proposalService, mentionService, adminService (敏感词增量更新)
│
└── frontend/
    ├── Dockerfile              # 多阶段构建: node:24-slim 编译 → nginx:alpine 服务
    ├── nginx.conf              # 反向代理 + SPA fallback + WebSocket + 安全头 + gzip
    ├── vite.config.js          # Vite 配置 (路径别名、开发代理)
    ├── package.json
    └── src/
        ├── main.js             # Vue 3 应用入口
        ├── App.vue             # 根组件 (el-config-provider 中文locale + 全局导航栏 + 路由过渡 + 全局聊天浮窗)
        ├── views/              # 17 个页面组件
        ├── components/         # 15 个可复用组件
        ├── stores/             # 4 个 Pinia Store
        ├── api/                # 7 个 API 模块
        ├── router/index.js     # 18 条路由 + 导航守卫
        ├── composables/        # 4 个组合式函数
        ├── utils/              # compressImage (Canvas API 图片压缩)
        └── assets/
            ├── styles/
            │   ├── variables.css  # CSS 变量 (主题色/字体/间距/等级色)
            │   └── global.css     # 全局样式 (重置/毛玻璃/按钮/印章/Element Plus 覆写)
            └── textures/       # 宣纸纹理 + 水墨素材 (16 个 SVG)
```

---

## 五、数据库设计

**数据库名**: `xueqi_db` | **字符集**: `utf8mb4` | **排序规则**: `utf8mb4_unicode_ci`

### 完整表清单（37 张表）

#### 用户与权限

| 表名                 | 用途       | 关键字段                                                                                                                                                                                                     |
| -------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `roles`              | 三级 RBAC  | id, name(super_admin/admin/user)                                                                                                                                                                             |
| `levels`             | 6 级等级   | id, name(书童~大儒), min_points, badge                                                                                                                                                                       |
| `users`              | 用户账户   | id, username, account_id(唯一六位), email, password_hash(bcryptjs), avatar_url, bio, role_id(FK), status(1=正常/0=禁言)                                                                                      |
| `user_stats`         | 学习统计   | user_id(FK), total_study_minutes, total_pomodoros, total_points, level_id(FK), daily_points, daily_reset_date, penalty_count, penalty_reset_date, ban_until, follower_count, following_count, checkin_streak |
| `points_log`         | 积分流水   | user_id, action(study/pomodoro/post/comment/volunteer 等), points(+/-), description                                                                                                                          |
| `notifications`      | 通知       | user_id, type(review_result/like/points/level_up/system/friend_request/mention), title, content, is_read, related_id, related_type                                                                           |
| `admin_applications` | 管理员申请 | user_id, reason, status(pending/approved/rejected), reviewer_id                                                                                                                                              |
| `feedback`           | 用户反馈   | user_id, type, content, status(pending/resolved/ignored), admin_reply                                                                                                                                        |
| `sensitive_words`    | 敏感词库   | word(VARCHAR 100, UNIQUE), created_by(FK), created_at                                                                                                                                                        |
| `reports`            | 举报       | reporter_id, target_type(post/comment/user), target_id, reason, status(pending/resolved/ignored), reviewer_id                                                                                                |
| `admin_login_logs`   | 管理员登录日志 | user_id, ip, user_agent, success, failure_reason, created_at                                                                                                                                                |

#### 好友与社交

| 表名              | 用途     | 关键字段                                                           |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `friend_requests` | 好友申请 | sender_id, receiver_id, message, status(pending/accepted/rejected) |
| `friendships`     | 好友关系 | user1_id, user2_id (user1 < user2, 联合唯一)                       |
| `blocks`          | 黑名单   | blocker_id, blocked_id (联合唯一)                                  |
| `user_follows`    | 关注关系 | follower_id + following_id (联合主键)                              |

#### 自习室与占座

| 表名                | 用途       | 关键字段                                                                                                     |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `study_rooms`       | 虚拟自习室 | name, description, capacity, type(virtual/real), cover_image, status                                         |
| `room_participants` | 参与者     | room_id, user_id, seat_number, is_studying                                                                   |
| `study_sessions`    | 学习记录   | user_id, room_id, session_type(pomodoro/free/timed), duration_minutes, status(active/completed/abandoned)    |
| `room_messages`     | 群聊消息   | room_id, user_id(nullable=系统), content, image_url, type(user/system/anonymous)                             |
| `message_reads`     | 已读回执   | message_id + user_id (联合主键)                                                                              |
| `real_locations`    | 实体地点   | name, building, floor, open_time, close_time, total_seats, available_seats                                   |
| `real_seats`        | 实体座位   | location_id(FK), seat_code, row_num, col_num, has_power, status(available/maintenance)                       |
| `seat_reservations` | 座位预约   | user_id, seat_id, reserve_date, start_time, end_time, status(pending/checked_in/completed/cancelled/no_show) |
| `volunteer_tasks`   | 志愿任务   | name, description, reward_penalty, reward_points                                                             |
| `volunteer_records` | 志愿记录   | user_id, task_id, status(pending/confirmed/rejected), admin_id                                               |

#### 社区

| 表名             | 用途     | 关键字段                                                                                                                                                                                                                                   |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `posts`          | 帖子     | user_id, title, content(MEDIUMTEXT), summary, category(experience/question/resource/general), is_anonymous, content_type(markdown), version, is_pinned, is_featured, permission(public/private), status(pending/published/hidden/rejected) |
| `comments`       | 评论     | post_id, user_id, parent_id(嵌套), content, is_anonymous, like_count, status                                                                                                                                                               |
| `tags`           | 标签     | name(UNIQUE)                                                                                                                                                                                                                               |
| `post_tags`      | 帖子标签 | post_id + tag_id (联合主键)                                                                                                                                                                                                                |
| `post_likes`     | 帖子点赞 | user_id + post_id (联合主键)                                                                                                                                                                                                               |
| `comment_likes`  | 评论点赞 | user_id + comment_id (联合主键)                                                                                                                                                                                                            |
| `post_versions`  | 版本历史 | post_id, version(int 自增), title, content, edit_summary                                                                                                                                                                                   |
| `edit_proposals` | 编辑提案 | post_id, proposer_id, content, base_version, status(open/merged/rejected/closed)                                                                                                                                                           |
| `post_bookmarks` | 收藏     | user_id + post_id (联合主键)                                                                                                                                                                                                               |
| `review_logs`    | 审核日志 | reviewer_id, target_type(post/comment/proposal), action(approve/reject), reason                                                                                                                                                            |

#### 私聊

| 表名               | 用途     | 关键字段                                                    |
| ------------------ | -------- | ----------------------------------------------------------- |
| `conversations`    | 会话     | user1_id, user2_id(user1<user2, 联合唯一), last_message_at  |
| `private_messages` | 私聊消息 | conversation_id(FK), sender_id, content, image_url, is_read |

### 种子数据

- 3 个角色: super_admin(id=1), admin(id=2), user(id=3)
- 6 个等级: 书童(0), 秀才(100), 举人(500), 进士(1500), 翰林(4000), 大儒(10000)
- 5 个示例用户（密码: `password`）: 学栖掌门(super_admin), admin01(admin), zhangsan/lisi/wangwu(user)
- 5 个虚拟自习室: 静修斋、明理堂、夜读轩、专攻阁、闲读居
- 4 个实体地点: 藏经阁A座/B座、讲经堂3号、明德书房，共 56 个物理座位
- 5 个志愿任务、15 个标签、5 篇示例帖子
- 126 条预设敏感词（脏话、歧视、诈骗、暴力、违禁品、校园作弊等 6 大类）

---

## 六、认证与权限

### JWT 双 Token 机制

```
登录 → 返回 accessToken(15min) + refreshToken(7d) + 用户信息(含 avatar_url)
     → accessToken 存 localStorage，refreshToken:
       · 开发环境: localStorage + 请求体传递
       · 生产环境: httpOnly Cookie（浏览器自动携带）
     → Axios 拦截器自动附加 Authorization: Bearer <accessToken>
     → 401 响应时自动用 refreshToken 刷新（window.__refreshPromise 并发去重）
     → 刷新失败则 logout + 跳转 /login?redirect=原路径
```

**JWT 工具** (`services/shared/src/jwt.js`):
- `generateToken(payload)` — 生成 accessToken，管理员 5min，普通用户 15min
- `generateRefreshToken(payload)` — 生成 refreshToken，管理员 1d，普通用户 7d
- `verifyToken(token)` — 验证并解码，失败返回 null
- `JWT_SECRET` 未设置时进程直接退出（安全：拒绝无密钥启动）

### Token 载荷结构

```json
// 用户 Token
{
  "userId": 1,
  "username": "学栖掌门",
  "roleId": 1,
  "roleName": "super_admin"
}

// 服务间 Token (serviceAuth)
{
  "userId": 0,
  "username": "study-service",
  "type": "service",
  "roleName": "service"
}
```

### 四个认证中间件 (`services/shared/src/auth.js`)

| 中间件                  | 功能          | 验证方式                                             |
| ----------------------- | ------------- | ---------------------------------------------------- |
| `authMiddleware`        | 强制认证      | JWT 验证 → DB 用户查询（含 status 检查）→ `req.user` |
| `optionalAuth`          | 可选认证      | Token 存在时附加用户，不拦截未认证请求               |
| `requireRole(...roles)` | RBAC 角色检查 | 工厂函数，检查 `req.user.roleName` 是否在允许列表    |
| `serviceAuthMiddleware` | 服务间调用    | JWT 中必须有 `type=service` 声明，不查 DB            |

### authMiddleware 验证流程

```
请求 → 提取 Bearer Token → verifyToken 解码
     → pool.execute 查询 users JOIN roles
     → 检查 status (0=禁言 → 403)
     → 附加 req.user = { userId, username, accountId, email, roleId, roleName }
```

### 三级 RBAC

| 角色            | role_id | 权限范围                                              |
| --------------- | ------- | ----------------------------------------------------- |
| **super_admin** | 1       | 全部权限 + 指定/取消管理员 + 系统统计/趋势 + 反馈管理 |
| **admin**       | 2       | 审核内容 + 管理座位/教室/自习室 + 禁言用户 + 志愿审核 |
| **user**        | 3       | 正常使用所有功能、发帖/评论、申请管理员               |

### 内容审核策略

帖子/评论**直接发布**为 `published`，管理员后续管理（隐藏/编辑/删除/置顶/精选）。管理后台支持按分类、状态、作者、关键词筛选。

---

## 七、安全设计

### 7.1 CORS 域名白名单

所有后端服务（5 处）和 Socket.IO 均使用环境变量 `CORS_ORIGIN` 控制的域名级白名单：

```js
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    try {
      const o = new URL(origin);
      const allowed = allowedOrigins.some(a => {
        const u = new URL(a.trim());
        return u.hostname.replace(/^www\./, '') === o.hostname.replace(/^www\./, '');
      });
      return cb(null, allowed);
    } catch {
      return cb(null, allowedOrigins.includes(origin));
    }
  },
  credentials: true
}));
```

基于域名匹配（非精确字符串），兼容 `http`/`https`、`www.`/不带 `www.` 的情况。

涉及文件：`api-gateway/src/app.js`、`user-service/src/app.js`、`study-service/src/app.js`、`community-service/src/app.js`、`study-service/src/socket.js`

### 7.2 安全响应头

**Nginx 开发环境** (`frontend/nginx.conf`):
```nginx
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options SAMEORIGIN always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
```

**Nginx 生产环境** (`frontend/nginx.prod.conf`，额外包含):
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; ..." always;
```

**API 网关层** (`api-gateway/src/app.js`，生产环境额外包含):
```js
if (process.env.NODE_ENV === 'production') {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; ...");
}
```

### 7.2.1 认证安全

| 措施 | 说明 |
|------|------|
| **httpOnly Cookie** | 生产环境 Refresh Token 存储在 httpOnly + Secure + SameSite=Strict 的 Cookie 中，前端 JS 无法读取，防止 XSS 窃取 |
| **Redis fail-closed** | Redis 不可用时拒绝 refresh token 验证（返回 503），而非静默放行。防止攻击者通过使 Redis 不可用来重放已注销的 token |
| **账户锁定** | 连续 5 次登录失败后锁定 15 分钟（Redis 计数 + TTL） |
| **图形验证码** | 注册和登录均需图形验证码（SVG 生成 + Redis UUID 校验），防止暴力破解 |
| **Token 轮换** | Refresh Token 使用后立即作旧，颁发新 token（Redis 白名单 + 删除旧 key） |
| **401 拦截优化** | 后台 profile 检查失败时不触发页面跳转，避免注册页等无需认证的页面被闪切 |

### 7.2.4 管理员安全增强

| 措施 | 说明 |
|------|------|
| **独立登录入口** | 管理员通过 `/BFAY` 独立路径登录（前端为 `AdminLoginPage.vue`），普通登录页 `/login` 拦截管理员账号 |
| **登录审计日志** | 每次管理员登录（成功/失败）均记录到 `admin_login_logs` 表，含 IP、User Agent、失败原因。超级管理员可在后台「登录日志」模块查看 |
| **短 Token 有效期** | 管理员 accessToken 5min（普通用户 15min），refreshToken 1d（普通用户 7d），减少 token 泄露风险 |
| **独立限流与锁定** | 管理员登录使用独立的 Redis 锁定 key `login_fail:admin:${username}`，与普通登录互不影响 |
| **隐藏入口** | 登录页左侧竹子装饰图链接到管理后台，无文字提示，降低被扫描发现概率 |

**开发/生产差异**:
- 开发环境：refreshToken 存 localStorage，请求体传递
- 生产环境：refreshToken 存 httpOnly Cookie，浏览器自动携带

### 7.2.2 弃用 Cloudflare 的决策

项目初期计划使用 Cloudflare（DNS + CDN + HTTPS + WAF），最终弃用，原因：

1. **国内访问延迟**：Cloudflare 免费版没有中国大陆节点，最近节点在香港/日本。国内用户请求路径变为 `国内 → 香港 → 国内`，增加 50-150ms 延迟
2. **Flexible SSL 风险**：Cloudflare Flexible 模式下，Cloudflare 到服务器之间为 HTTP，存在中间人风险
3. **运维复杂度**：额外引入第三方服务，增加 DNS 切换、CORS 配置等维护成本

**替代方案**：Let's Encrypt + 阿里云 DNS
- HTTPS：Let's Encrypt 免费证书（自动续期），端到端加密
- DNS：阿里云云解析（免费基础版，国内解析快）
- 安全：代码层面的防护（CORS、CSP、HSTS、限流、输入验证、敏感词等）已足够应对校园场景
- DDoS：阿里云 ECS 自带 5Gbps 基础防护

### 7.2.3 未实施 MySQL 读写分离的决策

项目架构设计中评估了 MySQL 主从复制 + 读写分离方案（主库负责写操作，从库负责读操作），最终未实施，原因：

1. **单机部署无实际收益**：项目以 Docker Compose 单机部署，主从库运行在同一台服务器上，读写分离不会带来真正的性能提升，反而因复制链路增加少量开销
2. **实现成本高**：需要修改共享模块 `xueqi-shared` 的 DB 连接层（双连接池 + 读写路由）、所有 SELECT 查询逐一改为读连接、关键读取（写入后立即读）需走主库避免主从延迟导致数据不一致
3. **运维复杂度增加**：主从复制配置、从库延迟监控、故障切换处理在校园场景下收益不明显

**当前数据层架构已满足需求**：
- MySQL 20 连接池 + 17 个复合索引覆盖主要查询场景
- Redis 缓存用于排行榜（Sorted Set）、在线状态、好友关系、会话管理等高频读操作
- 热数据访问模式以实时通信（Socket.IO）为主，数据库直接查询压力可控

**后续可扩展方向**：日活达到万级时，可引入 MySQL 主从复制 + ProxySQL 中间件实现透明读写分离，应用层无需改动

### 7.3 密码安全

- **数据库密码** (`db.js`): `MYSQL_ROOT_PASSWORD` 未设置时进程退出，无硬编码回退
- **Redis 密码** (`redis.js`): 通过 `REDIS_PASSWORD` 环境变量认证
- **JWT 密钥** (`jwt.js`): `JWT_SECRET` 未设置时进程退出
- **用户密码**: bcryptjs 哈希存储，10 轮 salt

### 7.4 Docker 非 root 运行

所有 4 个后端服务 Dockerfile 统一使用 `su-exec` 模式：

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads && chown -R appuser:appgroup /app
RUN apk add --no-cache su-exec
CMD ["sh", "-c", "chown -R appuser:appgroup /app/uploads 2>/dev/null; exec su-exec appuser node src/app.js"]
```

- 容器以 root 启动 → chown 修复 Docker 卷权限 → `su-exec` 降权到 `appuser` 运行 Node.js
- 上传目录 `/app/uploads` 对 `appuser` 可写

### 7.5 Service Token 角色降级

服务间调用生成的 JWT 使用 `roleName: 'service'`（非 super_admin），`serviceAuthMiddleware` 仅检查 `type === 'service'`，不依赖 roleName。

### 7.6 限流策略

| 层级           | 限制                               | 配置位置                      |
| -------------- | ---------------------------------- | ----------------------------- |
| Nginx          | 30 req/s (burst 50)                | `nginx.conf`                  |
| API 网关全局   | 500 req / 15min                    | `api-gateway/src/app.js`      |
| API 网关认证   | 50 req / 15min (/register, /login, /admin/login) | `api-gateway/src/app.js`      |
| Socket.IO 聊天 | 2s 冷却                            | `study-service/src/socket.js` |

### 7.7 其他安全措施

- **隐藏技术栈**: `app.disable('x-powered-by')` 隐藏 Express 标识
- **.dockerignore**: 排除 `.git`、`node_modules`、`.env`、`*.md` 等，防止敏感文件泄入镜像
- **Multer 文件过滤**: 仅允许 `.jpg/.jpeg/.png/.gif/.webp`，验证 MIME 类型
- **Markdown 安全**: DOMPurify 过滤 XSS，自定义 allowed tags/attrs
- **SQL 注入防护**: 全部使用 mysql2 参数化查询（`?` 占位符）

### 7.8 敏感词过滤系统

**核心引擎** (`services/shared/src/sensitiveFilter.js`):

基于 DFA/Trie 字典树算法，所有微服务启动时从数据库加载敏感词到内存。

**抗绕过预处理** — 检测前自动对输入文本执行：
1. 全角→半角转换（U+FF01–U+FF5E）
2. 转小写
3. 繁体→简体（300+ 字符映射表）
4. 移除所有非字母数字、非中文字符（对抗插符号/空格分割）

**两种过滤模式**：

| 模式 | 函数           | 行为                                           | 适用场景                 |
| ---- | -------------- | ---------------------------------------------- | ------------------------ |
| 阻止 | `check(text)`  | 返回 `{ hasSensitive, words }`，调用方拒绝请求 | 帖子、评论、用户名、简介 |
| 替换 | `filter(text)` | 敏感词替换为 `***`，返回处理后文本             | 群聊消息、私聊消息       |

**全服务覆盖**：

| 服务              | 过滤内容                        | 模式 |
| ----------------- | ------------------------------- | ---- |
| community-service | 帖子标题/正文、评论、管理员编辑 | 阻止 |
| study-service     | 自习室群聊消息、好友私聊消息    | 替换 |
| user-service      | 注册用户名、个人简介            | 阻止 |

**增量更新**: 管理员增删敏感词时通过 `addWord()`/`removeWord()` 增量修改 Trie，无需全量重建。

**词库管理**: 管理后台提供批量添加（按行分割）和删除功能，支持管理员自定义 + 126 条预设种子数据。

---

## 八、错误处理

### 统一响应格式 (`services/shared/src/responseHandler.js`)

```js
// 成功
res.success(data, message, code)
→ { success: true, message: "Success", data: {...} }

// 错误
res.error(message, code, errors)
→ { success: false, message: "错误描述" }

// 分页
res.paginate(data, total, page, pageSize)
→ { success: true, data: [...], pagination: { total, page, pageSize, totalPages } }
```

### 全局错误处理 (`services/shared/src/errorHandler.js`)

```js
errorHandler(err, req, res, next) {
  // MySQL 重复 → 409 "数据已存在，请检查输入"
  // JWT 无效 → 401 "Token 无效"
  // JWT 过期 → 401 "Token 已过期"
  // Validation 自定义 → 400 err.message
  // Multer 文件过大 → 413 "文件大小超出限制"
  // 其他 → status(500) "服务器内部错误"（不暴露 err.message）
}
```

所有控制器统一使用 `try/catch + next(err)` 模式，由集中式 errorHandler 统一处理。500 错误不暴露内部错误消息给客户端。

### 前端错误处理 (`frontend/src/api/request.js`)

- **请求拦截器**: 自动附加 `Authorization: Bearer <token>`
- **响应拦截器**: `success === false` 时 reject 并携带中文错误消息
- **401 处理**: 自动用 refreshToken 刷新（`window.__refreshPromise` 并发去重），失败则 logout
- **网络错误**: 显示 "网络错误，请检查网络连接"

---

## 九、API 参考

### 网关路由

| 前缀               | 目标服务               | 特殊配置                              |
| ------------------ | ---------------------- | ------------------------------------- |
| `/api/user/*`      | user-service:3001      | `/register` `/login` `/admin/login` 限流 50req/15min |
| `/api/study/*`     | study-service:3002     | `ws: true` WebSocket 代理             |
| `/api/community/*` | community-service:3003 | —                                     |

网关代理时自动修复 `Content-Type` 缺少 charset 的问题，服务不可用时返回 503 中文消息。

### 用户服务 `/api/user` (3001)

#### 认证
| 方法 | 路径              | 认证 | 说明                                                            |
| ---- | ----------------- | ---- | --------------------------------------------------------------- |
| POST | `/register`       | 无   | 注册（密码 bcryptjs 加密）                                      |
| POST | `/login`          | 无   | 用户登录（拦截管理员账号）                                      |
| POST | `/admin/login`    | 无   | 管理员独立登录（审计日志 + 短 Token）                           |
| PUT  | `/change-password`| 需要 | 修改密码（验证旧密码，修改成功需重新登录）                      |
| POST | `/refresh`        | 无   | 刷新 Token                                                      |
| POST | `/logout`         | 需要 | 登出（吊销 refreshToken）                                       |

#### 用户信息
| 方法 | 路径             | 认证 | 说明                              |
| ---- | ---------------- | ---- | --------------------------------- |
| GET  | `/profile`       | 需要 | 自己的资料                        |
| PUT  | `/profile`       | 需要 | 编辑资料                          |
| GET  | `/:id`           | 可选 | 他人公开资料                      |
| GET  | `/:id/stats`     | 可选 | 学习统计                          |
| POST | `/upload/avatar` | 需要 | 上传头像（5MB，前端压缩 300×300） |

#### 积分与排行
| 方法 | 路径                     | 认证   | 说明                         |
| ---- | ------------------------ | ------ | ---------------------------- |
| GET  | `/points`                | 需要   | 积分和等级                   |
| GET  | `/points/log`            | 需要   | 积分流水                     |
| POST | `/points/daily-checkin`  | 需要   | 每日签到（连续签到奖励递增） |
| POST | `/points/award`          | 服务间 | 内部积分发放                 |
| POST | `/points/checkin-streak` | 服务间 | 更新连续签到                 |
| GET  | `/leaderboard`           | 可选   | 积分总排行                   |
| GET  | `/leaderboard/weekly`    | 可选   | 周排行                       |
| GET  | `/leaderboard/monthly`   | 可选   | 月排行                       |
| GET  | `/leaderboard/study`     | 可选   | 学习时长排行                 |
| GET  | `/leaderboard/streak`    | 可选   | 签到排行                     |
| GET  | `/leaderboard/my-rank`   | 需要   | 我的排名                     |

#### 通知
| 方法 | 路径                          | 认证   | 说明             |
| ---- | ----------------------------- | ------ | ---------------- |
| GET  | `/notifications`              | 需要   | 通知列表（分页） |
| GET  | `/notifications/unread-count` | 需要   | 未读数           |
| PUT  | `/notifications/:id/read`     | 需要   | 标记已读         |
| PUT  | `/notifications/read-all`     | 需要   | 全部已读         |
| POST | `/notifications/create`       | 服务间 | 内部创建通知     |

#### 好友
| 方法   | 路径                             | 认证   | 说明                        |
| ------ | -------------------------------- | ------ | --------------------------- |
| POST   | `/friends/requests`              | 需要   | 发送申请                    |
| PUT    | `/friends/requests/:id/accept`   | 需要   | 接受（返回 conversationId） |
| PUT    | `/friends/requests/:id/reject`   | 需要   | 拒绝                        |
| GET    | `/friends/requests`              | 需要   | 申请列表 (?type=incoming    | outgoing) |
| GET    | `/friends/requests/unread-count` | 需要   | 未读申请数                  |
| GET    | `/friends/search`                | 需要   | 搜索用户                    |
| GET    | `/friends`                       | 需要   | 好友列表                    |
| DELETE | `/friends/:userId`               | 需要   | 删除好友                    |
| GET    | `/friends/status/:targetUserId`  | 需要   | 关系状态                    |
| POST   | `/friends/block`                 | 需要   | 拉黑                        |
| DELETE | `/friends/block/:userId`         | 需要   | 取消拉黑                    |
| GET    | `/friends/blocked`               | 需要   | 黑名单                      |
| GET    | `/friends/is-friend`             | 服务间 | 内部好友检查                |

#### 关注
| 方法 | 路径                         | 认证 | 说明             |
| ---- | ---------------------------- | ---- | ---------------- |
| POST | `/follows/:userId`           | 需要 | 关注/取关 toggle |
| GET  | `/follows/:userId/check`     | 需要 | 是否关注         |
| GET  | `/follows/:userId/followers` | 可选 | 粉丝列表         |
| GET  | `/follows/:userId/following` | 可选 | 关注列表         |

#### 管理员
| 方法 | 路径                      | 认证        | 说明                                                     |
| ---- | ------------------------- | ----------- | -------------------------------------------------------- |
| GET  | `/admin/users`            | admin+      | 用户列表 (?search, role, status 筛选)                    |
| GET  | `/admin/users/:id`        | admin+      | 用户详情（含等级、积分、学习统计）                       |
| PUT  | `/admin/users/:id/role`   | super_admin | 变更角色                                                 |
| PUT  | `/admin/users/:id/status` | admin+      | 禁言/解禁                                                |
| GET  | `/admin/stats`            | super_admin | 全局统计                                                 |
| GET  | `/admin/stats/trend`      | super_admin | 14 天趋势数据（用户增长、活跃、学习时长、角色/分类分布） |
| POST | `/admin/apply`            | 需要        | 申请管理员                                               |
| GET  | `/admin/applications`     | super_admin | 申请列表                                                 |
| PUT  | `/admin/applications/:id` | super_admin | 审核申请                                                 |
| GET  | `/admin/login-logs`       | super_admin | 管理员登录日志（IP、User Agent、成功/失败、失败原因）   |

#### 反馈
| 方法 | 路径            | 认证        | 说明                    |
| ---- | --------------- | ----------- | ----------------------- |
| POST | `/feedback`     | 需要        | 提交反馈                |
| GET  | `/feedback`     | super_admin | 反馈列表 (?status 筛选) |
| PUT  | `/feedback/:id` | super_admin | 更新状态 + 管理员回复   |

### 学习内容服务 `/api/study` (3002)

#### 自习室
| 方法 | 路径                      | 认证   | 说明       |
| ---- | ------------------------- | ------ | ---------- |
| GET  | `/rooms`                  | 可选   | 自习室列表 |
| GET  | `/rooms/:id`              | 可选   | 详情       |
| GET  | `/rooms/:id/participants` | 可选   | 参与者列表 |
| POST | `/rooms`                  | admin+ | 创建       |
| PUT  | `/rooms/:id`              | admin+ | 编辑       |
| POST | `/rooms/join-by-code`     | 需要   | 面对面聊天：输入房间号加入（自动创建） |
| POST | `/rooms/:id/join`         | 需要   | 加入房间   |
| POST | `/rooms/:id/leave`        | 需要   | 离开房间   |
| DELETE | `/rooms/:id`            | 需要   | 删除面对面房间（仅创建者） |

#### 学习记录
| 方法   | 路径                | 认证 | 说明                                |
| ------ | ------------------- | ---- | ----------------------------------- |
| POST   | `/sessions/start`   | 需要 | 开始学习                            |
| PUT    | `/sessions/:id/end` | 需要 | 结束学习（计算时长，≥25min 奖积分） |
| DELETE | `/sessions/active`  | 需要 | 放弃当前                            |
| GET    | `/sessions/my`      | 需要 | 我的记录                            |
| GET    | `/sessions/active`  | 需要 | 当前活跃（计时器恢复）              |

#### 实体占座
| 方法   | 路径                        | 认证   | 说明                              |
| ------ | --------------------------- | ------ | --------------------------------- |
| GET    | `/locations`                | 可选   | 地点列表                          |
| GET    | `/locations/:id`            | 可选   | 地点详情                          |
| GET    | `/locations/:id/seats`      | 可选   | 座位图                            |
| POST   | `/locations`                | admin+ | 添加地点                          |
| PUT    | `/locations/:id`            | admin+ | 编辑                              |
| DELETE | `/locations/:id`            | admin+ | 删除                              |
| POST   | `/locations/:id/seats`      | admin+ | 批量添加座位（行列 + 前缀）       |
| POST   | `/seats/:id/reserve`        | 需要   | 预约（检查 ban_until + 同日重复） |
| PUT    | `/reservations/:id/checkin` | 需要   | 签到                              |
| PUT    | `/reservations/:id/cancel`  | 需要   | 取消                              |
| GET    | `/reservations/my`          | 需要   | 我的预约                          |
| GET    | `/reservations/my/penalty`  | 需要   | 违约状态                          |

#### 志愿任务
| 方法 | 路径                           | 认证   | 说明                    |
| ---- | ------------------------------ | ------ | ----------------------- |
| GET  | `/volunteer/tasks`             | 需要   | 任务列表                |
| POST | `/volunteer/apply/:task_id`    | 需要   | 申请                    |
| GET  | `/admin/volunteer/pending`     | admin+ | 待确认                  |
| PUT  | `/admin/volunteer/:id/confirm` | admin+ | 确认（扣违约 + 奖积分） |
| PUT  | `/admin/volunteer/:id/reject`  | admin+ | 拒绝                    |

#### 群聊
| 方法 | 路径                       | 认证 | 说明                               |
| ---- | -------------------------- | ---- | ---------------------------------- |
| GET  | `/chat/rooms/:id/messages` | 需要 | 聊天记录（匿名脱敏）               |
| GET  | `/chat/rooms`              | 需要 | 聊天房间列表                       |
| GET  | `/chat/my-rooms`           | 需要 | 我加入的房间                       |
| POST | `/chat/mark-read`          | 需要 | 标记已读                           |
| POST | `/chat/upload`             | 需要 | 上传聊天图片（10MB，前端按需压缩） |

#### 私聊
| 方法 | 路径                                  | 认证 | 说明          |
| ---- | ------------------------------------- | ---- | ------------- |
| GET  | `/private/conversations`              | 需要 | 会话列表      |
| POST | `/private/conversations`              | 需要 | 创建/获取会话 |
| GET  | `/private/conversations/:id/messages` | 需要 | 消息记录      |
| PUT  | `/private/conversations/:id/read`     | 需要 | 标记已读      |
| GET  | `/private/unread-count`               | 需要 | 未读总数      |
| GET  | `/private/users/:userId/status`       | 需要 | 在线状态      |
| GET  | `/private/online-users`               | 需要 | 在线用户列表  |

### 社区服务 `/api/community` (3003)

#### 帖子
| 方法   | 路径                                    | 认证 | 说明                                          |
| ------ | --------------------------------------- | ---- | --------------------------------------------- |
| GET    | `/posts`                                | 可选 | 帖子列表 (?category, keyword, sort, tag 筛选) |
| GET    | `/posts/:id`                            | 可选 | 详情（浏览量 +1）                             |
| POST   | `/posts`                                | 需要 | 创建（+5 积分 + @提及通知 + 自动版本记录）    |
| PUT    | `/posts/:id`                            | 需要 | 编辑（版本号自增）                            |
| DELETE | `/posts/:id`                            | 需要 | 删除（仅作者或管理员）                        |
| POST   | `/posts/:id/like`                       | 需要 | 点赞 toggle（被赞者 +1 积分）                 |
| GET    | `/posts/:id/versions`                   | 可选 | 版本历史                                      |
| GET    | `/posts/:id/versions/:version`          | 可选 | 特定版本内容                                  |
| POST   | `/posts/:id/versions/:version/rollback` | 需要 | 回滚版本                                      |
| GET    | `/my/posts`                             | 需要 | 我的帖子                                      |
| GET    | `/users/:userId/posts`                  | 无   | 某用户的帖子                                  |

#### 评论
| 方法   | 路径                      | 认证 | 说明                        |
| ------ | ------------------------- | ---- | --------------------------- |
| GET    | `/posts/:postId/comments` | 可选 | 评论列表（含 @提及解析）    |
| POST   | `/posts/:postId/comments` | 需要 | 评论（+2 积分 + @提及通知） |
| DELETE | `/comments/:id`           | 需要 | 删除                        |
| POST   | `/comments/:id/like`      | 需要 | 点赞 toggle                 |
| GET    | `/my/comments`            | 需要 | 我的评论                    |

#### 标签
| 方法 | 路径    | 认证 | 说明     |
| ---- | ------- | ---- | -------- |
| GET  | `/tags` | 无   | 标签列表 |

#### 收藏与提案
| 方法   | 路径                    | 认证 | 说明        |
| ------ | ----------------------- | ---- | ----------- |
| POST   | `/bookmarks/:postId`    | 需要 | 收藏 toggle |
| GET    | `/my/bookmarks`         | 需要 | 我的收藏    |
| GET    | `/proposals`            | 可选 | 提案列表    |
| GET    | `/proposals/:id`        | 可选 | 提案详情    |
| POST   | `/proposals`            | 需要 | 创建提案    |
| PUT    | `/proposals/:id/merge`  | 需要 | 合并提案    |
| PUT    | `/proposals/:id/reject` | 需要 | 拒绝提案    |
| DELETE | `/proposals/:id`        | 需要 | 关闭提案    |
| GET    | `/my/proposals`         | 需要 | 我的提案    |

#### 上传
| 方法 | 路径            | 认证 | 说明                 |
| ---- | --------------- | ---- | -------------------- |
| POST | `/upload/image` | 需要 | 文章图片（5MB 限制） |

#### 管理员
| 方法   | 路径                          | 认证   | 说明                                               |
| ------ | ----------------------------- | ------ | -------------------------------------------------- |
| GET    | `/admin/posts/pending`        | admin+ | 待审核帖子                                         |
| GET    | `/admin/posts/all`            | admin+ | 所有帖子 (?category, status, author, keyword 筛选) |
| PUT    | `/admin/posts/:id/review`     | admin+ | 审核 (approve/reject)                              |
| PUT    | `/admin/posts/:id/pin`        | admin+ | 置顶 toggle                                        |
| PUT    | `/admin/posts/:id/feature`    | admin+ | 精选 toggle                                        |
| PUT    | `/admin/posts/:id/hide`       | admin+ | 隐藏 toggle                                        |
| PUT    | `/admin/posts/:id/edit`       | admin+ | 管理员编辑                                         |
| DELETE | `/admin/posts/:id`            | admin+ | 删除帖子                                           |
| GET    | `/admin/comments/pending`     | admin+ | 待审核评论                                         |
| GET    | `/admin/comments/all`         | admin+ | 所有评论 (?postId 筛选)                            |
| PUT    | `/admin/comments/:id/review`  | admin+ | 审核评论                                           |
| DELETE | `/admin/comments/:id`         | admin+ | 删除评论                                           |
| GET    | `/admin/proposals/pending`    | admin+ | 待审核提案                                         |
| PUT    | `/admin/proposals/:id/merge`  | admin+ | 合并提案                                           |
| PUT    | `/admin/proposals/:id/reject` | admin+ | 拒绝提案                                           |
| GET    | `/admin/review-logs`          | admin+ | 审核日志 (?targetType 筛选)                        |
| GET    | `/admin/sensitive-words`      | admin+ | 敏感词列表 (分页)                                  |
| POST   | `/admin/sensitive-words`      | admin+ | 批量添加敏感词                                     |
| DELETE | `/admin/sensitive-words/:id`  | admin+ | 删除敏感词                                         |

---

## 十、Socket.IO 实时通信

Socket.IO 服务端运行在 study-service，客户端通过 Nginx `/socket.io/` 代理连接。

### 连接管理

- **认证**: JWT token 通过 `socket.handshake.auth.token` 传入
- **心跳**: 客户端 30s 一次 `online:heartbeat`，心跳时重新验证 token
- **重连**: 最多 10 次，间隔 2s，`websocket` 优先降级 `polling`
- **在线追踪**: 内存 Map (含 socketCount 多端支持) + Redis 持久化

### 客户端 → 服务端（16 个事件）

| 事件               | 数据                                       | 说明                                |
| ------------------ | ------------------------------------------ | ----------------------------------- |
| `room:join`        | roomId                                     | 加入自习室频道                      |
| `room:leave`       | roomId                                     | 离开                                |
| `seat:join`        | locationId                                 | 订阅座位更新                        |
| `seat:leave`       | locationId                                 | 取消订阅                            |
| `chat:message`     | { roomId, content, anonymous?, imageUrl? } | 群聊消息（≤2000 字，2s 冷却）       |
| `chat:typing`      | roomId                                     | 正在输入                            |
| `chat:stopTyping`  | roomId                                     | 停止输入                            |
| `chat:markRead`    | { roomId }                                 | 标记已读                            |
| `status:update`    | { roomId, status, elapsedSeconds }         | 更新学习状态                        |
| `pm:send`          | { toUserId, content, imageUrl? }           | 私聊（仅好友，2s 冷却，黑名单检查） |
| `pm:typing`        | { toUserId }                               | 私聊输入指示                        |
| `pm:stopTyping`    | { toUserId }                               | 停止输入                            |
| `pm:markRead`      | { conversationId }                         | 标记私聊已读                        |
| `online:heartbeat` | —                                          | 30s 心跳（维持在线状态）            |
| `online:login`     | —                                          | 上线通知                            |
| `online:getUsers`  | callback                                   | 获取在线用户列表                    |

### 服务端 → 客户端（17 个事件）

| 事件                  | 数据                                                                                     | 说明                                        |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| `chat:message`        | { id, roomId, userId, username, avatarUrl, content, imageUrl, type, createdAt }          | 群聊消息（匿名时 userId/avatarUrl 为 null） |
| `chat:error`          | { message }                                                                              | 错误                                        |
| `chat:rateLimited`    | { cooldown }                                                                             | 发送过快                                    |
| `chat:typing`         | { userId, username }                                                                     | 他人正在输入                                |
| `chat:stopTyping`     | { userId }                                                                               | 停止输入                                    |
| `chat:readUpdate`     | { roomId, readByUserId }                                                                 | 已读回执                                    |
| `room:onlineUsers`    | { roomId, users, count }                                                                 | 在线用户列表                                |
| `room:participants`   | (data)                                                                                   | 参与者变化                                  |
| `status:update`       | { userId, username, status, elapsedSeconds }                                             | 学习状态变化                                |
| `seat:update`         | (data)                                                                                   | 座位状态变化                                |
| `pm:message`          | { id, conversationId, senderId, senderName, senderAvatar, content, imageUrl, createdAt } | 私聊消息                                    |
| `pm:error`            | { message }                                                                              | 私聊错误（非好友、被拉黑）                  |
| `pm:typingStatus`     | { userId }                                                                               | 对方正在输入                                |
| `pm:stopTypingStatus` | { userId }                                                                               | 停止输入                                    |
| `pm:readUpdate`       | { conversationId, readByUserId }                                                         | 私聊已读                                    |
| `online:statusChange` | { userId, username, avatarUrl, status }                                                  | 上线/下线（全局广播）                       |
| `friend:request`      | { requestId, fromUserId, fromNickname, fromAvatar }                                      | 新好友申请                                  |
| `friend:accepted`     | { acceptedByUserId, conversationId }                                                     | 好友申请被接受                              |

### 跨服务通信（Redis Pub/Sub）

user-service 和 study-service 通过 Redis Pub/Sub 实现跨服务事件传递：

```
user-service                          study-service
    │                                      │
    ├─ 好友申请 → PUBLISH xueqi:friend_events ─→ SUBSCRIBE → socket.emit('friend:request')
    ├─ 好友接受 → PUBLISH ─────────────────────────────────→ socket.emit('friend:accepted')
    │                                      │
    └─ Redis SET 缓存好友/黑名单 ──────→ SISMEMBER 检查私聊权限
```

---

## 十一、前端架构

### 路由（19 条）

| 路径                                  | 组件              | name     | 需登录 | 管理员 |
| ------------------------------------- | ----------------- | -------- | ------ | ------ |
| `/`                                   | HomePage          | —        | 否     | —      |
| `/login`                              | LoginPage         | Login    | 否     | —      |
| `/register`                           | RegisterPage      | Register | 否     | —      |
| `/BFAY`                               | AdminLoginPage    | AdminLogin | 否   | —      |
| `/study-rooms`                        | StudyRoomsPage    | —        | 否     | —      |
| `/seat-booking`                       | SeatBookingPage   | —        | 否     | —      |
| `/community`                          | CommunityPage     | —        | 否     | —      |
| `/community/create`                   | KnowledgeEditPage | —        | 是     | —      |
| `/community/posts/:id`                | PostDetailPage    | —        | 否     | —      |
| `/community/posts/:id/edit`           | KnowledgeEditPage | —        | 是     | —      |
| `/community/proposals/create/:postId` | ProposalPage      | —        | 是     | —      |
| `/community/proposals/:id`            | ProposalPage      | —        | 否     | —      |
| `/messages`                           | MessagesPage      | —        | 是     | —      |
| `/messages/:id`                       | ChatPage          | —        | 是     | —      |
| `/leaderboard`                        | LeaderboardPage   | —        | 否     | —      |
| `/profile`                            | ProfilePage       | —        | 是     | —      |
| `/admin`                              | AdminPage         | —        | 是     | 是     |
| `/user/:id`                           | UserPage          | —        | 否     | —      |
| `/:pathMatch(.*)*`                    | NotFoundPage      | —        | 否     | —      |

**导航守卫**: `beforeEach` 从 localStorage 恢复会话，检查 `requiresAuth` / `requiresAdmin`，未登录跳转 `/login?redirect=原路径`

**导航栏**: 渲染在 `App.vue` 根组件，Login/Register 页不显示（通过 `route.name` 判断）。使用 `router-link-exact-active` 精确匹配当前页面高亮。

### Pinia Store（4 个）

| Store     | 关键状态                                                                                 | 关键 Actions                                                                          | Socket 事件                     |
| --------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| `user`    | token, refreshToken, user(含 avatar_url), unreadCount, isLoggedIn, isAdmin, isSuperAdmin | login, register, logout, setToken, fetchProfile, fetchUnreadCount                     | —                               |
| `chat`    | chatRoomId, roomInfo, isOpen, unreadCount, onlineUsers                                   | openChat, closeChat, toggleChat, fetchRoomList, incrementUnread, setOnlineUsers       | room:join, room:leave           |
| `friend`  | friends, incomingRequests, outgoingRequests, unreadRequestCount                          | fetchFriends, sendRequest, acceptRequest, deleteFriend, blockUser                     | friend:request, friend:accepted |
| `message` | conversations, currentMessages, unreadTotal, onlineUsers                                 | fetchConversations, openConversation, fetchMessages, markAsRead, setupSocketListeners | pm:message, online:statusChange |

### API 模块（7 个）

| 模块        | 文件               | 后端前缀                    | 说明                                                                     |
| ----------- | ------------------ | --------------------------- | ------------------------------------------------------------------------ |
| `request`   | `api/request.js`   | `/api`                      | Axios 基础配置（拦截器、自动刷新 Token、401 处理）                       |
| `user`      | `api/user.js`      | `/api/user/*`               | authAPI, userAPI, pointsAPI, notificationAPI, adminAPI, feedbackAPI      |
| `study`     | `api/study.js`     | `/api/study/*`              | roomAPI, sessionAPI, locationAPI, seatAPI, volunteerAPI, chatAPI         |
| `community` | `api/community.js` | `/api/community/*`          | postAPI, commentAPI, tagAPI, communityAdminAPI, bookmarkAPI, proposalAPI |
| `message`   | `api/message.js`   | `/api/study/private-chat/*` | 私聊会话、消息、在线状态                                                 |
| `friend`    | `api/friend.js`    | `/api/user/friends/*`       | 好友申请、列表、拉黑、搜索                                               |
| `follow`    | `api/follow.js`    | `/api/user/follows/*`       | 关注、粉丝                                                               |

### Composables（4 个）

| 组合函数        | 用途                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `useSocket`     | Socket.IO 单例连接管理（30s 心跳、最多 10 次重连、重连时刷新 token） |
| `useTimeAgo`    | 中文相对时间格式化（刚刚/X分钟前/X小时前/X天前）                     |
| `useFormatDate` | 中文绝对日期格式化（YYYY年M月D日），共享 composable 避免重复定义     |
| `useInkRipple`  | 水墨点击涟漪动画效果                                                 |

### 组件（15 个）

| 组件                | 用途                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| `AppNavbar`         | 全局导航栏（毛玻璃、路由精确匹配高亮、通知铃铛、用户下拉菜单、主题切换、移动端抽屉） |
| `AppFooter`         | 全局页脚（云纹装饰）                                                                 |
| `GlobalChat`        | 全局聊天浮窗（已登录时显示，可最小化）                                               |
| `RoomChat`          | 自习室群聊面板（匿名模式、表情面板、图片上传压缩、乐观更新 + 去重、亮/暗主题、过滤系统消息） |
| `UserProfileCard`   | 用户资料卡弹窗（加好友/发消息/拉黑）                                                 |
| `AmbientSoundMixer` | 环境音混合器（雨声/蝉鸣/古琴/风声，多轨混合）                                        |
| `MarkdownEditor`    | Markdown 编辑器（图片上传/拖拽/粘贴、@提及自动补全、表格按钮）                       |
| `MarkdownViewer`    | Markdown 渲染（@链接、图片拖拽缩放、代码高亮）                                       |
| `OnlineUsers`       | 在线用户列表                                                                         |
| `UserAvatar`        | 头像组件（可点击弹资料卡、缺省显示首字）                                             |
| `FooterDrawer`      | 底部抽屉面板                                                                         |
| `AppLoading`        | 加载骨架屏                                                                           |
| `AppEmpty`          | 空状态提示                                                                           |
| `BackButton`        | 返回按钮                                                                             |

### 视图页面（18 个）

| 页面                         | 复杂度 | 说明                                                   |
| ---------------------------- | ------ | ------------------------------------------------------ |
| `HomePage`                   | 30KB   | GSAP 长翻页动画、书院推荐、统计展示                    |
| `StudyRoomsPage`             | 31KB   | 自习室列表、沉浸模式、群聊、环境音、番茄钟、面对面聊天（输入房间号加入） |
| `AdminPage`                  | 47KB   | 左侧边栏 + 右侧内容区、12 个管理模块、ECharts 图表     |
| `ProfilePage`                | 41KB   | 多 Tab（概览/帖子/收藏/提案/关注/粉丝/通知）、资料编辑、修改密码 |
| `AdminLoginPage`             | —      | 管理员独立登录页（深色主题、验证码）                   |
| `PostDetailPage`             | —      | 文章阅读、评论树、版本历史、编辑提案                   |
| `CommunityPage`              | —      | 帖子列表（分类/搜索/排序/标签筛选）、用户资料卡        |
| `ChatPage`                   | —      | 私聊（表情、图片压缩上传、在线状态、已读回执）         |
| `MessagesPage`               | —      | 消息/好友/申请三 Tab、好友搜索、用户搜索               |
| `SeatBookingPage`            | —      | 座位图可视化、预约/签到/取消、违约状态                 |
| `LeaderboardPage`            | —      | 五维排行切换                                           |
| `KnowledgeEditPage`          | —      | Markdown 编辑器、创建/编辑复用                         |
| `ProposalPage`               | —      | 编辑提案详情、合并/拒绝                                |
| `LoginPage` / `RegisterPage` | —      | 表单验证、直接跳转                                     |
| `UserPage`                   | —      | 他人公开主页                                           |
| `NotFoundPage`               | —      | 404 页面                                               |

---

## 十二、关键功能实现

### 图片上传管线

```
用户选择图片 → 前端判断文件大小
  ├─ ≤ 限制大小 → 直接上传（不压缩）
  └─ > 限制大小 → Canvas API 压缩 → 压缩后仍超则降质量二次压缩 → 上传
→ FormData multipart/form-data → Multer diskStorage → Docker 共享卷 → Nginx 静态服务
```

**各场景限制与压缩参数：**

| 场景     | 后端限制 | 压缩参数          | 二次压缩       |
| -------- | -------- | ----------------- | -------------- |
| 头像     | 5MB      | 300×300, q=0.85   | —              |
| 私聊图片 | 10MB     | 800×800, q=0.8    | 600×600, q=0.5 |
| 群聊图片 | 10MB     | 800×800, q=0.8    | 600×600, q=0.5 |
| 文章图片 | 5MB      | 1200×1200, q=0.85 | 800×800, q=0.6 |

**compressImage 工具** (`utils/compressImage.js`):
- Canvas API 缩放 + JPEG 质量 reduction
- 尺寸已在范围内则返回原文件（不压缩）
- 压缩失败时回退返回原文件
- Nginx 兜底: `client_max_body_size 15MB`

### 群聊消息机制

```
用户发送 → 乐观更新 (local-{timestamp} 前缀消息)
        → Socket emit('chat:message', { roomId, content, anonymous, imageUrl })
        → 后端持久化到 room_messages 表
        → 后端 formatMessage 脱敏（匿名时 userId/avatarUrl 置 null）
        → 广播给全房间

前端收到回传 → 检查 local- 前缀消息（不依赖 userId 匹配，兼容匿名）
            → 替换乐观消息为服务端消息
            → 非自身消息播放通知音 + 增加未读数
```

**聊天面板**: 房间详情下方展开（不替换），支持亮色/暗色主题切换，自动过滤加入/退出系统消息。纯图片消息以 `[图片]` 作为内容持久化，前端通过 `msgImageUrl()` 兼容 Socket 广播的 camelCase 和 API 历史的 snake_case。

### 面对面聊天

```
用户输入房间号（1-99999） → POST /api/study/rooms/join-by-code
  → roomService.findOrCreateByCode(code, userId)
    → 查找 name='面对面 #{code}' 的活跃房间
    → 不存在则自动创建（type=virtual, capacity=50）
  → 返回房间信息 → 前端选中该房间 → 复用现有聊天/消息机制
```

**房间清理**: 空闲超过 5 分钟的面对面房间由 `startStaleRoomCleaner()` 自动删除（每 60 秒检查）。

### 空闲用户自动踢出

```
每 60 秒定时检查:
  → 查找满足以下条件的参与者:
    - is_studying = 1
    - 加入超过 10 分钟
    - 10 分钟内无 'user' 类型消息
  → 设置 is_studying = 0
  → Socket 广播 idle-kick 事件通知房间内其他用户
```

### @提及功能

```
输入 @ → 立即显示好友列表 → 本地过滤 → 可选搜索 API
      → 选择后插入 @username
      → 发帖/评论时后端 mentionService 解析:
         parseMentions(content)     — 正则 /@([\w\u4e00-\u9fff]+)/g
         resolveMentions(usernames) — 查询 users 表
         notifyMentions(...)        — 调用 user-service 创建通知
      → 被提及用户收到通知
      → MarkdownViewer 渲染 @username 为可点击链接 → /user/{userId}
```

### 积分与等级系统

**积分规则：**

| 行为                 | 积分       | 上限                    |
| -------------------- | ---------- | ----------------------- |
| 完成自习（≥25 分钟） | +10        | 每日 50                 |
| 番茄钟               | +5         | 每日 25                 |
| 预约座位并签到       | +15        | 每次                    |
| 发帖                 | +5         | 每日 20                 |
| 评论                 | +2         | 每日 10                 |
| 被点赞               | +1         | 无上限                  |
| 连续签到             | +n（递增） | 上限 +30                |
| 志愿任务             | +5~10      | 每次，同时扣减 1 次违约 |

**等级体系：**

| 等级 | 名称 | 积分  | 印章样式 |
| ---- | ---- | ----- | -------- |
| Lv.1 | 书童 | 0     | 绿色小印 |
| Lv.2 | 秀才 | 100   | 蓝色方印 |
| Lv.3 | 举人 | 500   | 朱砂方印 |
| Lv.4 | 进士 | 1500  | 金色方印 |
| Lv.5 | 翰林 | 4000  | 金色圆印 |
| Lv.6 | 大儒 | 10000 | 朱砂大印 |

**每日积分重置**: `daily_points` + `daily_reset_date` 字段，首次请求时检查日期并重置。

### 违约惩罚机制

```
预约超时 20 分钟未签到
  → study-service 定时检查器自动释放座位 (status='no_show')
  → user_stats.penalty_count + 1
  → 禁预约天数 = 违约次数 × 2 天
  → 每月 1 日重置 penalty_count

解除途径:
  完成志愿任务 → 管理员确认 → 扣减 1 次违约 + 奖励积分
```

---

## 十三、视觉设计系统

### 设计理念

**「墨韵书声，栖心之所」** — 传统水墨美学为底色，融合毛玻璃现代效果。

### 色彩方案

| 用途       | 色值      | 名称       | 说明                       |
| ---------- | --------- | ---------- | -------------------------- |
| 主背景     | `#F5F0E8` | 宣纸白     | 米白底色                   |
| 次背景     | `#EDE6D6` | 古卷黄     | 卡片底色                   |
| 主文字     | `#2C2C2C` | 浓墨       | 近纯黑                     |
| 次文字     | `#6B6B6B` | 淡墨       | 辅助文字                   |
| **强调色** | `#8B2500` | **朱砂红** | 按钮、链接、印章、活跃导航 |
| 辅助色1    | `#2E5C4C` | 松绿       | 自习室、学习模块           |
| 辅助色2    | `#4A6B8A` | 靛蓝       | 知识模块                   |
| 辅助色3    | `#B8860B` | 赭金       | 积分、排行榜               |
| 边框色     | `#C4B99A` | 旧绢       | 卡片边框                   |

### 字体

| 用途 | 字体                                         |
| ---- | -------------------------------------------- |
| 标题 | `"楷体", "STKaiti", "KaiTi", serif`          |
| 正文 | `"思源宋体", "Noto Serif SC", "宋体", serif` |
| 代码 | `"Fira Code", monospace`                     |

### 毛玻璃策略

- **使用 `backdrop-filter: blur(12px)`**: 导航栏、弹窗（少量固定元素）
- **不使用**: 帖子列表、卡片等大量重复元素（改用半透明 `rgba()` 背景）

### 装饰元素

| 元素         | 实现方式                                          |
| ------------ | ------------------------------------------------- |
| 宣纸纹理     | SVG background-image, opacity 0.5                 |
| 印章徽章     | CSS border + transform: rotate(-2deg), 按等级变色 |
| 水墨角饰     | SVG, opacity 0.06                                 |
| 涟漪动画     | radial-gradient + CSS @keyframes                  |
| 卡片墨迹悬浮 | ink-dots.svg, hover 时 opacity 0.06               |

### Element Plus 主题覆写

```css
:root {
  --el-color-primary: #8B2500;          /* 朱砂红 */
  --el-color-primary-light-3: #a84d33;
  --el-color-primary-light-5: #c47a66;
  --el-color-primary-light-7: #d9a08f;
  --el-color-primary-light-9: #f0cfc6;
  --el-color-primary-dark-2: #6f1e00;
  --el-border-radius-base: 8px;
  --el-font-family: var(--font-body);
  --el-bg-color: var(--glass-bg-card);
}
```

---

## 十四、部署指南

### Docker Compose 容器（7 个）

| 容器                      | 镜像           | 主机端口  | 依赖                   | 运行用户          |
| ------------------------- | -------------- | --------- | ---------------------- | ----------------- |
| `xueqi-mysql`             | mysql:8.0      | 3307:3306 | —                      | mysql (默认)      |
| `xueqi-redis`             | redis:7-alpine | 6380:6379 | —                      | redis (默认)      |
| `xueqi-user-service`      | node:24-alpine | 3001:3001 | mysql, redis (healthy) | appuser (su-exec) |
| `xueqi-study-service`     | node:24-alpine | 3002:3002 | mysql, redis (healthy) | appuser (su-exec) |
| `xueqi-community-service` | node:24-alpine | 3003:3003 | mysql, redis (healthy) | appuser (su-exec) |
| `xueqi-gateway`           | node:24-alpine | 3000:3000 | 三个后端服务 (started) | appuser (su-exec) |
| `xueqi-frontend`          | nginx:alpine   | 80:80     | gateway                | nginx (默认)      |

**命名卷**: `mysql-data`（MySQL 持久化）、`redis-data`（Redis AOF）、`upload-data`（上传文件共享）

**网络**: `xueqi-net`（单 bridge 网络）

### 环境变量

```env
# MySQL
MYSQL_HOST=xueqi-mysql
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=root123           # 生产环境务必修改
MYSQL_DATABASE=xueqi_db

# Redis
REDIS_HOST=xueqi-redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123               # 密码认证

# CORS 白名单
CORS_ORIGIN=http://localhost,http://localhost:80

# JWT
JWT_SECRET=your-secret-key-change-in-production   # 必填，生产环境使用 openssl rand -hex 32 生成
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Service Ports
USER_SERVICE_PORT=3001
STUDY_SERVICE_PORT=3002
COMMUNITY_SERVICE_PORT=3003
GATEWAY_PORT=3000

# File Upload
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5242880                  # 5MB
```

**安全要求**:
- `MYSQL_ROOT_PASSWORD`、`JWT_SECRET` 未设置时后端服务拒绝启动
- `REDIS_PASSWORD` 未设置时 Redis 连接不使用密码（本地开发可留空）
- `CORS_ORIGIN` 不设时默认仅允许 `http://localhost`
- 生产环境 `JWT_SECRET` 使用 `openssl rand -hex 32` 生成强随机密钥

### Nginx 配置

| 路径            | 行为                                                   |
| --------------- | ------------------------------------------------------ |
| `/assets/`      | 静态文件，30 天缓存，public+immutable                  |
| `= /index.html` | 不缓存 (no-cache, no-store)，确保 SPA 更新即时生效     |
| `/api/`         | 代理到 gateway:3000，限流 30r/s burst 50，30s 超时     |
| `/socket.io/`   | 代理到 study-service:3002，WebSocket upgrade，24h 超时 |
| `/uploads/`     | 共享卷静态文件，7 天缓存                               |
| `/`             | SPA fallback: `try_files $uri $uri/ /index.html`       |

**安全头**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
**生产额外**: Strict-Transport-Security (HSTS), Content-Security-Policy (CSP)
**其他**: gzip (text/css/json/js/xml/svg, ≥256B)、charset utf-8、client_max_body_size 15MB

### 三种测试环境

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **1. 本地开发测试** | `docker compose up --build -d` | 日常开发调试，HTTP，所有端口映射到宿主机 |
| **2. 本地模拟服务器** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.test.yml up -d --build` | 本地验证生产配置（HTTPS、隐藏端口、生产 Nginx），使用自签名证书 |
| **3. 真实服务器部署** | 服务器上 `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` | 正式上线，Let's Encrypt 真实证书，无内部端口暴露 |

**本地开发 vs 生产环境差异**:

| 维度 | 本地开发 (`docker-compose.yml`) | 生产 (`docker-compose.yml` + `docker-compose.prod.yml`) |
|------|------|------|
| Nginx 配置 | `nginx.conf`（仅 HTTP:80） | `nginx.prod.conf`（HTTP:80 → HTTPS:443 重定向） |
| HTTPS | 无（Vite dev server 或 HTTP） | Let's Encrypt SSL 证书 |
| 内部服务端口 | 全部映射到宿主机（3001-3003, 3307, 6380） | 不映射（仅 Docker 网络内部访问） |
| NODE_ENV | 未设置 | `production` |
| 安全头 | 基础 4 个（X-Content-Type 等） | 基础 + HSTS + CSP |
| Refresh Token | localStorage + 请求体传递 | httpOnly Cookie（浏览器自动携带） |
| MySQL 认证插件 | `mysql_native_password` | `caching_sha2_password` |
| CORS_ORIGIN | `http://localhost,http://localhost:80` | `https://你的域名.com` |
| Redis | 基础 healthcheck | 密码验证 healthcheck |

**方式 2 说明**: `docker-compose.test.yml` 覆盖 SSL 证书路径为本地 `./ssl/` 目录（自签名），无需真实域名即可在本地验证 HTTPS 重定向、生产 Nginx 配置、安全头等行为。浏览器访问 `https://localhost` 会提示证书不受信任，点击"继续访问"即可正常测试。

### 常用命令

```bash
# === 方式 1：本地开发测试 ===
# 全量启动（首次或数据库变更后）
docker compose up --build -d

# 仅重建前端
docker compose build xueqi-frontend && docker compose up -d xueqi-frontend

# 仅重建某个后端服务
docker compose build xueqi-user-service && docker compose up -d xueqi-user-service

# 重建所有服务
docker compose build && docker compose up -d

# === 方式 2：本地模拟服务器 ===
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.test.yml up -d --build

# === 通用命令 ===
# 查看日志
docker compose logs -f xueqi-gateway

# 进入数据库
docker exec -it xueqi-mysql mysql -uroot -proot123 xueqi_db

# 验证 Redis
docker exec xueqi-redis redis-cli -a redis123 ping

# 验证非 root 运行
docker exec xueqi-user-service ps aux | grep node

# 停止所有容器
docker compose down
```

### 本地开发（非 Docker）

```bash
# 安装所有依赖
npm run install:all

# 启动后端（需要 MySQL + Redis）
cp .env.example .env.local   # 修改为 localhost
npm run dev                    # concurrently 启动 4 个后端服务

# 启动前端
cd frontend && npm run dev    # Vite dev server, 端口 5173

# 同时启动前后端
npm run dev:full
```

**前端 Vite 代理**: `/api` → localhost:3000（网关），`/uploads` → localhost:3001（用户服务）

### 注意事项

- 后端代码未通过 volume 挂载，变更需 `docker compose build` + `up`
- 前端构建产物在 Docker build 阶段生成，Nginx 直接 serve 静态文件
- 上传文件通过 `upload-data` 命名卷在 3 个后端服务和 nginx 之间共享
- MySQL 初始化脚本仅**首次启动**执行，后续需手动执行新增 migration SQL
- MySQL 配置: utf8mb4 + utf8mb4_unicode_ci + mysql_native_password

---

## 十五、关键技术决策

| #   | 决策                                                | 原因                                               |
| --- | --------------------------------------------------- | -------------------------------------------------- |
| 1   | 帖子直接发布，管理员后续管理                        | 减少发布摩擦，管理员可隐藏/编辑/删除               |
| 2   | 跨服务积分：业务服务完成后调用用户服务              | 单点积分管理，Redis 队列补偿失败                   |
| 3   | 排行榜缓存：Redis Sorted Set + 每日刷新 + 实时增量  | 读多写少场景优化                                   |
| 4   | GSAP 统一动画框架                                   | 桌面 pin 翻页 + 移动端降级普通滚动                 |
| 5   | CSS 变量 + SVG 纹理 + CSS border-radius 印章        | 无额外图片依赖，纯代码实现中国风                   |
| 6   | 毛玻璃仅用于导航栏/弹窗                             | `backdrop-filter` 对大量卡片有性能影响             |
| 7   | Socket.IO JWT 认证 + 消息持久化 + 已读回执          | 聊天可追溯，多端同步                               |
| 8   | Redis Pub/Sub 跨服务好友事件                        | user-service 管理 MySQL，study-service 推送 Socket |
| 9   | Multer diskStorage + Docker volume                  | 无云存储依赖，简化部署                             |
| 10  | 违约 20 分钟超时 × 2 天禁预约 + 志愿减免            | 柔性惩罚 + 正向激励                                |
| 11  | 前端图片按需压缩（小图直传，大图压缩）              | 平衡质量与上传成功率                               |
| 12  | 群聊乐观更新 + local- 前缀去重（不依赖 userId）     | 兼容匿名消息脱敏后的匹配                           |
| 13  | Dockerfile su-exec 模式（root 启动 → chown → 降权） | 兼容 Docker 卷权限 + 非 root 运行                  |
| 14  | 集中式错误处理，500 不暴露 err.message              | 安全：防止内部错误泄露                             |
| 15  | CORS 白名单环境变量控制                             | 防止跨域攻击，灵活配置                             |
| 16  | 密码/JWT_SECRET 必填，无硬编码回退                  | 安全：拒绝无密钥启动                               |
| 17  | DFA 敏感词过滤 + 预处理抗绕过                       | 全角/繁简/大小写/插字符均无法绕过，覆盖全服务      |
| 18  | 聊天用替换模式，帖子/用户名用阻止模式               | 聊天不阻断交流，帖子/用户名严格把关                |
| 19  | 敏感词增量更新（addWord/removeWord）                | 避免管理员增删词时的全量重建空档                   |
| 20  | Element Plus 全局中文 locale                        | 日期选择器、分页等组件自动中文化                   |
| 21  | httpOnly Cookie 存储 Refresh Token（生产环境）     | 防 XSS 窃取 token，前端 JS 无法访问               |
| 22  | Redis fail-closed 策略                              | Redis 不可用时拒绝操作（非静默放行），防 token 重放 |
| 23  | CORS 域名匹配（非精确字符串）                       | 兼容 http/https、www/非 www，避免 CORS 配置遗漏   |
| 24  | Let's Encrypt 替代 Cloudflare                       | 国内用户直连服务器，避免绕道海外节点增加延迟       |
| 25  | 管理员独立登录入口（`/BFAY`）                       | 隔离管理/用户登录，独立限流审计，普通入口拦截管理员 |
| 26  | 管理员短 Token（5min access + 1d refresh）          | 减少管理员 token 泄露风险                           |
| 27  | 管理员登录审计日志                                   | 追溯异常登录行为，IP + UA + 成功/失败全记录        |
| 28  | 修改密码需重新登录                                   | 密码变更后强制重新认证，使所有已发 token 失效       |
| 29  | 未实施 MySQL 读写分离                                | 单机部署无实际收益，实现/运维成本高，当前架构已满足校园场景 |
| 30  | docker-compose 三层配置（base + prod + test）       | 开发/模拟/生产三套环境共用基础配置，prod 覆盖安全加固，test 用自签名证书本地验证 HTTPS |
| 31  | 面对面房间按需创建（name 字段标识）                  | 避免预创建大量空房间，用户输入号码时才创建，5 分钟空闲自动清理 |
| 32  | 空闲 10 分钟无消息自动踢出                           | 防止用户占位不退出，释放房间容量给活跃用户 |
| 33  | 聊天面板与房间详情并存（下方展开，不替换）           | 用户可同时查看房间信息和聊天，不丢失上下文 |
