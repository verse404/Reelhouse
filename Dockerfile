# Stage 1: Compile TypeScript + Vite production frontend bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src

# Optional build-time public Firebase web config (also served at runtime via /api/client-config)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

RUN npm run build

# Stage 2: Sleep-friendly production BFF + static SPA runtime (Render / Railway / Fly.io / Cloud Run)
# Note: GITHUB_CRON_MANAGED=1 offloads all scheduled scraping to GitHub Actions so Render Free Tier
# sleeps cleanly after 15m of idle time, preserving your shared 750 free hours/month across multiple apps.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    PUBLIC_READONLY_MODE=1 \
    CONTAINER_RUNTIME=1 \
    GITHUB_CRON_MANAGED=1 \
    REMOTE_CATALOG_URL=https://raw.githubusercontent.com/verse404/Reelhouse/catalog-data/server/cache/live_catalog.json \
    REMOTE_CATALOG_POLL_MINUTES=30 \
    PORT=8080 \
    CACHE_TTL_HOURS=24 \
    RATINGS_TTL_HOURS=24

COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --from=builder --chown=node:node /app/dist ./dist

RUN mkdir -p /app/server/cache && chown -R node:node /app/server/cache

USER node
EXPOSE 8080

CMD ["node", "./server/index.mjs"]
