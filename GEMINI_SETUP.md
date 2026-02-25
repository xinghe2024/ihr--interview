# Gemini API 配置指南

本项目已配置为使用您自己的 Gemini API Key，不再依赖 Cursor 的 API 调用。

## 快速开始

### 1. 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 使用您的 Google 账号登录
3. 点击 "Create API Key" 创建新的 API Key
4. 复制生成的 API Key（格式类似：`AIzaSy...`）

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件（如果不存在）：

```bash
# 在项目根目录执行
touch .env.local
```

编辑 `.env.local` 文件，添加您的 API Key：

```env
GEMINI_API_KEY=你的API密钥
```

**示例：**
```env
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567
```

### 3. 安装依赖

```bash
npm install
```

这将安装 `@google/generative-ai` 包。

### 4. 运行项目

```bash
npm run dev
```

## 项目结构

- `utils/geminiApi.ts` - Gemini API 工具函数
- `components/EileenSidebar.tsx` - 已集成 Gemini API 调用
- `vite.config.ts` - 已配置环境变量读取

## API 使用说明

项目使用流式响应（streaming）来提供更好的用户体验，AI 回复会实时显示。

### 系统提示词

默认系统提示词为：
> "你是一个专业的AI招聘助手艾琳(Ailin)，帮助HR分析候选人简历和进行面试沟通。你的回复应该专业、友好、简洁。"

### 错误处理

如果 API Key 未配置或配置错误，系统会显示友好的错误提示：
- "请先配置 Gemini API Key。请在项目根目录创建 .env.local 文件，并设置 GEMINI_API_KEY=你的API密钥"

## 注意事项

1. **安全性**
   - `.env.local` 文件已被 `.gitignore` 忽略，不会提交到代码仓库
   - 请勿将 API Key 提交到版本控制系统

2. **API 配额**
   - 免费层有使用限制，请查看 [Google AI Studio 配额页面](https://aistudio.google.com/app/apikey)
   - 如果遇到配额限制，可以考虑升级到付费计划

3. **网络要求**
   - 需要能够访问 Google 的 API 服务
   - 如果在中国大陆，可能需要配置代理

4. **模型版本**
   - 当前使用 `gemini-pro` 模型
   - 如需使用其他模型（如 `gemini-pro-vision`），可在 `utils/geminiApi.ts` 中修改

## 故障排查

### 问题：API 调用失败

**检查清单：**
- [ ] `.env.local` 文件是否存在
- [ ] `GEMINI_API_KEY` 是否正确设置
- [ ] API Key 是否有效（未过期或被撤销）
- [ ] 网络连接是否正常
- [ ] API 配额是否充足

### 问题：依赖安装失败

如果 `npm install` 失败，可以尝试：
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 技术支持

如有问题，请检查：
1. 浏览器控制台的错误信息
2. 终端输出的错误日志
3. [Google Gemini API 文档](https://ai.google.dev/docs)
