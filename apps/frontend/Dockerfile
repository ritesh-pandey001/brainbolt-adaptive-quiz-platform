# ──────────────────────────────────────────────────────────────
# BrainBolt Frontend — Multi-stage Production Dockerfile (Node 20)
# ──────────────────────────────────────────────────────────────

# ── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base

# ── Install workspace dependencies ──────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci

# ── Build shared package ────────────────────────────────────
FROM base AS shared-builder
WORKDIR /app
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/shared && npm run build

# ── Build UI package ────────────────────────────────────────
FROM base AS ui-builder
WORKDIR /app
COPY tsconfig.json ./
COPY packages/ui ./packages/ui
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/ui && npm run build

# ── Build Next.js app ───────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY tsconfig.json ./
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=ui-builder /app/packages/ui/dist ./packages/ui/dist

ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/frontend && npm run build

# ── Production image ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/frontend/server.js"]
