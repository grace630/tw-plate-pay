# Cloud Run 用的映像檔。分兩階段：build 階段裝 devDependencies 編譯前端，
# 執行階段只留 production 依賴，映像檔小一點，Artifact Registry 免費的 0.5 GB 才放得下多個版本

FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
# --use-system-ca 會讀系統憑證庫，slim 映像檔預設沒有
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
USER node
# Cloud Run 會注入 PORT（預設 8080），server/index.ts 會讀它
CMD ["node", "--use-system-ca", "server/index.ts"]
