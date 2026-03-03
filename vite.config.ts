import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    // 前端入口在 client/ 目录下
    root: path.resolve(__dirname, 'client'),
    // 避免 Vite 默认读取项目根目录的 .env.local（在某些环境会触发 EPERM 权限问题）
    envDir: path.resolve(__dirname, 'env'),
    server: {
      port: 3000,
      host: '0.0.0.0',
      // 3000 被占用时自动顺延到 3001/3002...
      strictPort: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    // 构建输出到项目根目录的 dist/
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@client': path.resolve(__dirname, 'client'),
        '@server': path.resolve(__dirname, 'server'),
        '@shared': path.resolve(__dirname, 'shared'),
      }
    }
  };
});
