# 学栖 — 栖心之所 · 学问之道

一个面向大学生的**校园学习社区平台**，融合虚拟自习室、实体占座、社区讨论、积分排行、好友私聊等核心功能。整体 UI 风格为**古典中国风 × 书院气质**，配合毛玻璃效果与水墨装饰。

## 功能一览

| 模块 | 功能 |
|------|------|
| **书院** | 虚拟自习室、面对面聊天（输入房间号加入）、实时群聊（匿名/表情/图片）、番茄钟、学习计时、沉浸模式、环境音混合器 |
| **云占座** | 实体座位预约、座位图可视化、签到、违约惩罚（20 分钟超时自动释放）、志愿任务减免 |
| **知识广场** | 帖子/评论、Markdown 编辑器（图片上传/拖拽/粘贴）、@提及、匿名发布、点赞/收藏、编辑提案、版本管理 |
| **金榜** | 积分/学习时长/签到/周榜/月榜 五维排行 |
| **好友系统** | 申请/接受/拒绝、拉黑、私聊（仅好友，支持图片/表情）、实时在线状态 |
| **管理后台** | 文章/评论/用户/座位管理、敏感词管理、登录审计日志、ECharts 统计图表 |

## 技术栈

**前端**: Vue 3 + Vite 6 + Pinia 3 + Element Plus + Socket.IO + GSAP

**后端**: Node.js 24 + Express 5（3 个微服务 + API 网关）

**数据库**: MySQL 8.0 + Redis 7

**部署**: Docker Compose（7 容器）+ Nginx（反向代理 + HTTPS）

## 系统架构

```
浏览器 ──→ Nginx(:80/:443) ──→ API 网关(:3000) ──┬──→ 用户服务(:3001)
         │                                      ├──→ 学习服务(:3002) ← Socket.IO
         │                                      └──→ 社区服务(:3003)
         │                                             │
         │                            ┌────────────────┴────────────────┐
         │                            │     MySQL 8.0 + Redis 7        │
         │                            └────────────────────────────────┘
         │
         ├── /socket.io/* ──→ 学习服务 (WebSocket)
         ├── /uploads/*   ──→ 共享卷静态文件
         └── /*           ──→ Vue SPA
```

## 安全特性

- JWT 双 Token 认证（accessToken + httpOnly Cookie refreshToken）
- RBAC 三级权限（超级管理员 / 管理员 / 用户）
- DFA 敏感词过滤（全服务覆盖，抗全角/繁简/大小写绕过）
- CORS 域名白名单、CSP/HSTS 安全响应头
- 账户锁定（5 次失败锁定 15 分钟）、管理员独立登录 + 审计日志
- Docker 容器非 root 运行

## 本地运行

```bash
# 克隆项目
git clone https://github.com/BFAY-debug/xueqi.git
cd xueqi

# 配置环境变量
cp .env.example .env
# 编辑 .env，设置数据库密码和 JWT 密钥

# 启动所有服务
docker compose up -d --build
```

访问 `http://localhost` 即可使用。

## 项目结构

```
├── docker-compose.yml          # 基础容器编排
├── docker-compose.prod.yml     # 生产环境覆盖
├── docker-compose.test.yml     # 本地模拟测试覆盖
├── .env.example                # 环境变量模板
├── database/init/              # MySQL 初始化脚本（12 个）
├── services/
│   ├── shared/                 # 共享模块（DB、Redis、JWT、日志、敏感词等）
│   ├── api-gateway/            # API 网关（路由转发、限流、CORS）
│   ├── user-service/           # 用户服务（注册/登录/积分/好友/通知）
│   ├── study-service/          # 学习服务（自习室/占座/Socket.IO 聊天）
│   └── community-service/      # 社区服务（帖子/评论/审核/提案）
└── frontend/                   # Vue 3 前端（18 个页面、15 个组件）
```

## 第三方库许可证

本项目共使用 26 个第三方运行时依赖，许可证分布如下：

| 许可证类型 | 数量 | 说明 |
|-----------|------|------|
| MIT | 24 | 可自由使用、修改和分发 |
| Apache-2.0 | 1 | 可商用，需保留版权声明 |
| BSD-2-Clause | 1 | 可商用，需保留版权声明 |
| BSD-3-Clause | 1 | 可商用，需保留版权声明 |
| MPL-2.0 OR Apache-2.0 | 1 | 可商用，修改的文件需开源 |
| GSAP Standard License | 1 | 非开源，校园项目可免费使用 |

<details>
<summary>完整依赖列表</summary>

**MIT License (24)**
axios, bcryptjs, cookie-parser, cors, element-plus, express, express-rate-limit, http-proxy-middleware, ioredis, jsonwebtoken, marked, multer, mysql2, pinia, sanitize-html, socket.io, socket.io-client, svg-captcha, vue, vue-router, winston

**Apache-2.0 (1)**
echarts

**BSD-2-Clause (1)**
dotenv

**BSD-3-Clause (1)**
highlight.js

**MPL-2.0 OR Apache-2.0 (1)**
dompurify

**GSAP Standard License (1)**
gsap — https://gsap.com/standard-license/

</details>

## License

[MIT](LICENSE)
