# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (npm workspaces installs everything in root node_modules)
RUN npm ci

# Build shared package
FROM base AS shared-builder
WORKDIR /app
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/shared && npm run build

# Build backend
FROM base AS builder
WORKDIR /app
COPY tsconfig.json ./
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-builder /app/packages/shared/dist ./packages/shared/dist

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Build backend
RUN cd apps/backend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy necessary files
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared

USER backend

EXPOSE 3001

ENV PORT 3001

CMD ["node", "dist/index.js"]
