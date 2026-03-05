# Project Rules

## 🔒 禁止提交真实密钥

**任何提交到 Git 的文件中，严禁包含真实的 API Key、Secret、Token、密码等敏感信息。**

具体规则：
- `.env.production`、`.env.example`、`server/.env.example` 等模板文件只能包含占位符（如 `your-api-key`、`CHANGE_THIS`）
- 真实密钥只能存在于 `.env`（已在 .gitignore 中排除）
- `git add` 前必须检查暂存区中是否包含密钥：扫描高熵字符串、`sk-`、`eyJ`（完整 JWT）、UUID 格式的 API key 等
- 如果不确定某个值是否是真实密钥，一律替换为占位符

### 已知密钥模式（不得出现在提交中）
- 公司 LLM API Key：UUID 格式 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Supabase Service Role Key：以 `eyJ` 开头的完整 JWT
- JWT Secret：任何非占位符的随机字符串
- 各类 `API_KEY`、`API_SECRET` 的真实值

## 项目约定
- 语言：中文沟通，技术术语用英文
- 后端框架：Hono + Node.js
- 前端框架：React 19 + Vite
- 数据库：Supabase PostgreSQL
- `shared/types.ts` 是前后端共享类型的唯一来源
