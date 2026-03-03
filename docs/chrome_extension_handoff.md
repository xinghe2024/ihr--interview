# Chrome 插件认证授权 — 开发交接文档

> **日期**：2026-03-03
> **状态**：代码骨架已完成，待编译打包 + 数据库迁移 + 联调测试
> **前置阅读**：`docs/development_plan.md`（M0-M6 里程碑）、`server/TODO.md`（后端待办）

---

## 一、这次做了什么（已完成）

### 1.1 整体目标

给艾琳项目加上 Chrome 插件，让 HR 在智联招聘网页上直接用艾琳的功能。插件不需要 HR 重复登录——直接读取浏览器里智联招聘的登录状态（`at` cookie），换成艾琳自己的 JWT 令牌。

### 1.2 认证流程（核心逻辑）

```
HR 已在浏览器登录智联招聘（浏览器有 at/rt cookie）
       │
       ▼
[1] 插件 Background Service Worker 调用 chrome.cookies.get()
    读取 .zhaopin.com 域下的 at cookie
       │
       ▼
[2] 插件发请求到艾琳后端:
    POST /api/auth/zhaopin-exchange
    Body: { zpAccessToken: "<at cookie 的值>" }
       │
       ▼
[3] 后端用这个 token 调用智联 API 获取用户信息:
    GET cgate.zhaopin.com/userpassport/user/getUserInfo
    → 拿到: { userId, name, phone, companyName }
    → 如果智联 API 不通，降级解析 at (JWT格式) 提取身份
       │
       ▼
[4] 后端查找/创建本地用户 → 签发艾琳自己的 JWT
    返回: { token, refreshToken, user }
       │
       ▼
[5] 插件将 JWT 存入 chrome.storage
    后续所有请求自动带上: Authorization: Bearer <jwt>
```

### 1.3 登录态失效时的自动恢复

```
插件请求返回 401（JWT 过期）
  → 尝试用 refreshToken 刷新 → 成功则继续
  → 刷新也失败 → 重新读 at cookie → 重新 exchange
  → 没有 at cookie → 弹窗提示"请先登录智联招聘"
```

### 1.4 安全设计

| 要点 | 做法 | 原因 |
|------|------|------|
| JWT 存哪里 | `chrome.storage.session`（关浏览器就没了） | 防止别人开电脑偷看 |
| Refresh Token 存哪里 | `chrome.storage.local`（持久化） | 开浏览器后自动续期 |
| Content Script（注入网页的脚本） | 不持有任何 token | 网页脚本可能被恶意利用 |
| API 请求怎么走 | Content Script → Background SW → 后端 | 所有敏感操作由 SW 统一管理 |
| CORS | 服务端允许 `chrome-extension://` 来源 | 插件才能跨域请求后端 |

---

## 二、新建的文件清单

### 2.1 Chrome 插件（`extension/` 目录）

```
extension/
├── manifest.json                  # MV3 插件清单（权限声明、入口配置）
├── tsconfig.json                  # TypeScript 编译配置
├── icons/
│   ├── icon-32.png                # 插件小图标（占位）
│   └── icon-128.png               # 插件大图标（占位）
├── background/
│   └── service-worker.ts          # 核心调度：消息路由、自动登录、API 代理
├── popup/
│   ├── popup.html                 # 弹窗 UI（三态：未登录/待授权/已连接）
│   └── popup.ts                   # 弹窗逻辑
├── content/
│   └── zhaopin.ts                 # 注入智联页面：简历提取、页面上下文
├── sidepanel/
│   ├── sidepanel.html             # 侧边栏 UI（聊天界面）
│   └── sidepanel.ts               # 侧边栏逻辑（对接 Sidebar Agent）
└── shared/
    ├── constants.ts               # 常量：API 地址、cookie 名、消息类型
    ├── auth.ts                    # 认证管理：cookie 读取、token exchange/refresh
    └── api.ts                     # 统一 API 客户端（自动携带 JWT）
```

### 2.2 后端新增

| 文件 | 说明 |
|------|------|
| `server/src/services/zhaopinAuthService.ts` | 智联 token 验证服务（API 调用 + JWT 解析降级） |

---

## 三、修改的文件清单

### 3.1 `shared/types.ts`

```typescript
// 新增类型
export interface ZhaopinExchangeRequest {
  zpAccessToken: string;
}

// UserProfile 新增字段
export interface UserProfile {
  // ...原有字段不变
  zhaopinUserId?: string;  // 智联招聘用户 ID 关联
}
```

### 3.2 `server/src/routes/auth.ts`

新增路由 `POST /zhaopin-exchange`：
- 入参: `{ zpAccessToken: string }`
- 逻辑: 验证智联 token → upsert 用户（先按 zhaopin_user_id 查、再按 phone 查、都没有则创建） → 签发 JWT
- 返回: `LoginResponse { token, refreshToken, expiresIn, user }`

### 3.3 `server/src/index.ts`

CORS 配置改为函数式，自动允许 `chrome-extension://` 开头的来源：

```typescript
cors({
  origin: (origin) => {
    if (origin?.startsWith('chrome-extension://')) return origin;
    // ...原有逻辑
  },
  credentials: true,
})
```

### 3.4 `server/src/config/env.ts`

新增环境变量：
```
ZHAOPIN_API_BASE=https://cgate.zhaopin.com   # 智联 API 网关地址
```

---

## 四、待办事项（接下来要做的）

### 4.1 【必须】数据库迁移 — 加 zhaopin_user_id 字段

users 表需要新加一列，才能关联智联账号和艾琳账号。

**方式 A**：Supabase SQL Editor 直接执行
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS zhaopin_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_zhaopin_user_id ON users(zhaopin_user_id);
```

**方式 B**：新建迁移文件 `server/supabase/migrations/20260303000000_add_zhaopin_user_id.sql`，内容同上。

> 现有迁移文件 `20260301000000_initial_schema.sql` 里 users 表没有这个字段，所以必须加。

### 4.2 【必须】插件打包脚本

当前 `extension/` 下是 TypeScript 源码，Chrome 只认 JavaScript。需要配置打包工具将 `.ts` 编译成 `.js`，同时把 `manifest.json`、`.html`、图标等静态资源复制到输出目录。

**推荐方案**：用 Vite 或 esbuild，新建 `extension/build.ts` 或在 `package.json` 里加 build 脚本。

**需要做的事**：
1. 在 `extension/` 下初始化 `package.json`（`npm init -y`）
2. 安装 `typescript`、`esbuild`（或 `vite`）作为 devDependency
3. 编写 build 脚本，输出到 `extension/dist/`
4. `extension/dist/` 即可加载到 Chrome

### 4.3 【必须】更新 `.env.example`

在 `server/.env.example` 末尾补充：
```
# ─── 智联招聘 API ───────────────────────────────
ZHAOPIN_API_BASE=https://cgate.zhaopin.com
```

### 4.4 【建议】替换占位图标

`extension/icons/` 下现在是程序生成的纯色圆形占位图标，需要替换成真正的艾琳 logo。

### 4.5 【建议】Content Script 简历提取逻辑细化

`extension/content/zhaopin.ts` 中的 `extractResumeFromPage()` 目前用了通用 CSS 选择器猜测智联的 DOM 结构。实际使用时需要：
1. 在智联 rd6.zhaopin.com 的简历详情页打开 DevTools
2. 观察真实的 DOM 结构和 class 名
3. 更新选择器使之精确匹配

### 4.6 【建议】`extension/shared/constants.ts` 中 API 地址

目前硬编码为 `http://localhost:3001`，部署后需要改为真实后端地址。可以考虑做成配置项或根据 `manifest.json` 里的环境区分。

---

## 五、智联招聘认证体系参考（浏览器实测）

| 要素 | 值 |
|------|------|
| 登录页 | `https://passport.zhaopin.com/org/login?bkurl=` |
| 登录方式 | 扫码登录（App/微信）、短信登录、账号密码登录 |
| Access Token Cookie | 名称 `at`，域 `.zhaopin.com`，有效期 7 天 |
| Refresh Token Cookie | 名称 `rt`，域 `.zhaopin.com`，有效期 30 天 |
| API 网关 | `cgate.zhaopin.com` |
| 企业端入口 | `rd6.zhaopin.com`（未登录 302→passport 登录页） |
| 获取用户信息 API | `GET cgate.zhaopin.com/userpassport/user/getUserInfo`（Cookie: at=xxx） |

---

## 六、验证方案（测试清单）

完成上述待办后，按以下顺序验证：

| # | 测试项 | 预期结果 | 前置条件 |
|---|--------|----------|----------|
| 1 | 插件安装 | `chrome://extensions` 加载无报错 | 4.2 打包完成 |
| 2 | Cookie 读取 | 已登录智联时，Popup 显示"已检测到智联登录态" | 浏览器已登录智联 |
| 3 | Token Exchange | 点"授权连接"→ Popup 显示用户信息 | 后端运行中 + 4.1 迁移完成 |
| 4 | API 鉴权 | 侧边栏发消息 → 后端返回 AI 回复 | 3 通过 |
| 5 | JWT 失效恢复 | 手动清 storage → 下次请求自动刷新 | 3 通过 |
| 6 | 未登录提示 | 清除智联 cookie → Popup 显示"请先登录智联招聘" | 无 |

---

## 七、项目整体进度（截至 2026-03-03）

```
M0 基建层               ✅ 完成
M1 认证 + 候选人 CRUD   ✅ 完成
M2 简历解析流水线        ✅ 完成（代码就绪，依赖 LLM key）
M3 面试会话             ✅ 完成（代码就绪，依赖 STT）
M4 分析 + 报告          ✅ 完成（代码就绪，依赖 LLM key）
M5 Sidebar + 通知       ✅ 完成
M6 Docker + 联调        ✅ Dockerfile 就绪

Chrome 插件骨架          ✅ 本次完成
  ├─ 打包脚本            ❌ 待做（4.2）
  ├─ DB 迁移             ❌ 待做（4.1）
  └─ 联调测试            ❌ 待做（第六节）
```

**全局阻塞项**（与插件无关，之前就存在）：
- Supabase 连接信息未填入 `.env`
- LLM API key 未调通
- STT/SMS 服务待接入

---

## 八、关键文件速查表

| 用途 | 路径 |
|------|------|
| 前后端共享类型契约 | `shared/types.ts` |
| 后端入口 | `server/src/index.ts` |
| 认证路由（含 zhaopin-exchange） | `server/src/routes/auth.ts` |
| 智联 token 验证服务 | `server/src/services/zhaopinAuthService.ts` |
| JWT 服务 | `server/src/services/jwtService.ts` |
| 环境变量定义 | `server/src/config/env.ts` |
| 环境变量示例 | `server/.env.example` |
| 数据库初始 schema | `server/supabase/migrations/20260301000000_initial_schema.sql` |
| 插件清单 | `extension/manifest.json` |
| 插件核心 SW | `extension/background/service-worker.ts` |
| 插件认证管理 | `extension/shared/auth.ts` |
| 插件 API 客户端 | `extension/shared/api.ts` |
| 插件常量 | `extension/shared/constants.ts` |
| 开发计划 | `docs/development_plan.md` |
| 后端待办 | `server/TODO.md` |
| 需求文档 | `docs/requirements/requirements_v1.3.md` |

---

*Generated: 2026-03-03*
