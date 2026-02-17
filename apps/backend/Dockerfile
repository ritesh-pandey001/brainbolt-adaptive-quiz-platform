# ──────────────────────────────────────────────────────────────
# BrainBolt Backend — Multi-stage Production Dockerfile (Node 20)
# ──────────────────────────────────────────────────────────────

# ── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base

# ── Install workspace dependencies ──────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

# ── Build shared package ────────────────────────────────────
FROM base AS shared-builder
WORKDIR /app
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/shared && npm run build

# ── Build backend + Prisma client ───────────────────────────
FROM base AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY tsconfig.json ./
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Compile backend TypeScript → dist/
RUN cd apps/backend && npm run build

# ── Production image ────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime tools needed by entrypoint (pg_isready, redis-cli, openssl)
RUN apk add --no-cache postgresql-client redis openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy built artefacts
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared

# Fix permissions so entrypoint can run prisma db push
RUN chown -R backend:nodejs ./node_modules/.prisma || true
RUN chown -R backend:nodejs ./node_modules/@prisma || true

# Copy entrypoint script and ensure Unix line endings
COPY apps/backend/entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

USER backend

EXPOSE 3001

ENV PORT=3001

ENTRYPOINT ["./entrypoint.sh"]
