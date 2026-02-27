<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1m7YMD0GwGY9q4Dwo_BFWdWJEBb2Hgc2B

## Run Locally

**Prerequisites:**  Node.js

### 配置 Gemini API Key

1. **获取 API Key**
   - 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
   - 登录您的 Google 账号
   - 创建新的 API Key

2. **配置环境变量**
   - 在项目根目录创建 `.env.local` 文件
   - 添加以下内容：
     ```
     GEMINI_API_KEY=你的API密钥
     ```
   - ⚠️ 注意：`.env.local` 文件已被 `.gitignore` 忽略，不会提交到代码仓库

3. **安装依赖**
   ```bash
   npm install
   ```

4. **运行项目**
   ```bash
   npm run dev
   ```

### 注意事项

- 确保您的 Gemini API Key 有效且有足够的配额
- 如果遇到 API 调用错误，请检查：
  - API Key 是否正确配置
  - 网络连接是否正常
  - API 配额是否充足
