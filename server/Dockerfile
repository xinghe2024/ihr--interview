# ─── Stage 1: Builder（全量依赖，编译 TypeScript）─────
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件（先复制，利用 Docker layer cache）
COPY server/package.json server/package-lock.json* ./server/
COPY shared/ ./shared/

# 安装全量依赖（含 devDependencies：tsc、tsc-alias）
# 注：package-lock.json 在 .gitignore 中，用 npm install 代替 npm ci
WORKDIR /app/server
RUN npm install

# 复制源码
COPY server/src/ ./src/
COPY server/tsconfig.json ./

# 编译 TypeScript → dist/
RUN npm run build

# ─── Stage 2: 仅生产依赖 ──────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev

# ─── Stage 3: Runner ──────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# 从 deps 阶段复制生产 node_modules
COPY --from=deps /app/server/node_modules/ ./node_modules/
# 从 builder 阶段复制编译产物
COPY --from=builder /app/server/dist/ ./dist/
# 复制 package.json（node 需要识别 "type": "module"）
COPY --from=builder /app/server/package.json ./

# 创建上传目录
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server/src/index.js"]
