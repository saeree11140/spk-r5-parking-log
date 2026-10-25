# Build context: repository root.
#   docker build -f apps/frontend/Dockerfile -t spk-r5-frontend .

FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile --filter frontend...

COPY packages/shared-types packages/shared-types
COPY apps/frontend apps/frontend
RUN pnpm --filter @spk-r5-parking-log/shared-types build \
    && pnpm --filter frontend build

# Commit SHA from CI, served as /version.txt for the deploy job. Written
# after the build so a new SHA does not invalidate the cached build layers.
ARG APP_VERSION=dev
RUN printf '%s\n' "$APP_VERSION" > apps/frontend/dist/version.txt

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 8080
