# ─── Stage 1: Vite 构建 ───────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 root 级 package（Vite 和 React 依赖在这里）
# 注：package-lock.json 在 .gitignore 中，用 npm install 代替 npm ci
COPY package.json ./

# 复制构建配置和源码
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY client/ ./client/
COPY shared/ ./shared/

# 安装依赖
RUN npm install

# 构建静态文件 → dist/
RUN npm run build

# ─── Stage 2: nginx 静态服务 ──────────────────────────
FROM nginx:1.27-alpine

# 删除 nginx 默认页面
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# 复制 nginx 配置
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
