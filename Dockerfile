# Stage 1: Compile TypeScript + Vite production frontend bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN npm run build

# Stage 2: Hardened non-root production BFF + static SPA runtime (Render / Railway / Fly.io / Cloud Run)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    PUBLIC_READONLY_MODE=1 \
    CONTAINER_RUNTIME=1 \
    PORT=8080 \
    CACHE_TTL_HOURS=24 \
    RATINGS_TTL_HOURS=24

COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --from=builder --chown=node:node /app/dist ./dist

RUN mkdir -p /app/server/cache && chown -R node:node /app/server/cache

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/api/healthz || exit 1

CMD ["node", "./server/index.mjs"]
