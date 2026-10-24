# Build context: repository root.
#   docker build -f apps/backend/Dockerfile -t spk-r5-backend .

FROM node:22-bookworm-slim AS build
# Prisma's schema engine needs libssl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
RUN corepack enable
# prisma generate reads prisma.config.ts, which needs a DATABASE_URL to
# exist. Nothing connects to it; it never reaches the runtime image.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter backend...

COPY packages/shared-types packages/shared-types
COPY apps/backend apps/backend
RUN pnpm --filter @spk-r5-parking-log/shared-types build \
    && pnpm --filter backend build \
    && pnpm --filter backend deploy --prod --legacy /out

FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/backend/package.json ./
COPY --from=build /repo/apps/backend/prisma.config.ts ./
COPY --from=build /repo/apps/backend/prisma ./prisma
COPY --from=build /repo/apps/backend/dist ./dist

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.BACKEND_PORT || 3001}/api/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

# Apply pending migrations on every start; applied ones are skipped.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main"]
