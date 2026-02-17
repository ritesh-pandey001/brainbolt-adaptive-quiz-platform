#!/bin/sh
set -e

echo "=== BrainBolt Backend Entrypoint ==="

# ─── Wait for PostgreSQL ────────────────────────────────────────────
echo "Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT ..."
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -q 2>/dev/null; do
  echo "  PostgreSQL not ready - retrying in 2s..."
  sleep 2
done
echo "PostgreSQL is ready!"

# ─── Wait for Redis ─────────────────────────────────────────────────
echo "Waiting for Redis at $REDIS_HOST:$REDIS_PORT ..."
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; do
  echo "  Redis not ready - retrying in 2s..."
  sleep 2
done
echo "Redis is ready!"

# ─── Run Prisma DB Push (schema sync — no migration files needed) ───
echo "Running prisma db push..."
npx prisma db push --skip-generate --accept-data-loss 2>&1
echo "Database schema synced!"

# ─── Run Prisma Seed ────────────────────────────────────────────────
echo "Running database seed..."
node prisma/seed.js 2>&1 || echo "Seed completed (may have been already seeded)"
echo "Seed done!"

# ─── Start the Backend Server ───────────────────────────────────────
echo "Starting BrainBolt backend server..."
exec node dist/index.js
