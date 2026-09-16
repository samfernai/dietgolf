# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next only needs these at runtime, but the build refuses to start without one.
ENV NEXT_TELEMETRY_DISABLED=1
ENV SESSION_SECRET=build-time-placeholder-not-used-at-runtime
RUN npm run build

# ---- runtime ----------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run sends traffic to $PORT and expects the server on all interfaces.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone bundle already carries .next/static, public/ and drizzle/
# (see scripts/bundle-standalone.mjs) plus a minimal node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate-and-start.mjs ./scripts/migrate-and-start.mjs

USER nextjs
EXPOSE 8080

# Applies any pending migrations, then serves.
CMD ["node", "scripts/migrate-and-start.mjs"]
