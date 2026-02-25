import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      // 避免 Vite 默认读取项目根目录的 .env.local（在某些环境会触发 EPERM 权限问题）
      // 如需使用环境变量，可将 env 文件放到 ./env 目录下（例如 env/.env 或 env/.env.local）
      envDir: path.resolve(__dirname, 'env'),
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 3000 被占用时自动顺延到 3001/3002...，避免“端口不可访问但用户不知道原因”
        strictPort: false,
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
