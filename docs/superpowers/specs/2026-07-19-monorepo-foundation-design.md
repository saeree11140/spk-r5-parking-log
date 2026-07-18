# SPK R5 Parking Log Monorepo Foundation Design

## Goal

Create a pnpm workspace containing independently runnable and buildable Next.js frontend, NestJS backend, and shared TypeScript types package. This step excludes database, Prisma, authentication, Docker, and parking-violation business logic.

## Architecture

- Root workspace owns cross-project commands and includes `apps/*` and `packages/*`.
- `apps/frontend` is a Next.js App Router application using TypeScript, Tailwind CSS, ESLint, `src`, and static export.
- `apps/backend` is a NestJS application using strict TypeScript, global `/api` prefix, CORS, request validation, and environment-based port selection.
- `packages/shared-types` compiles reusable types and declaration files for frontend and backend consumers.
- `docs/business-rules.md` records domain rules without implementing them.

## Components

### Frontend

Single responsive system-check page containing required product name, purpose, and running status. Visual direction uses asphalt navy, safety amber, road-marking white, and restrained parking-bay linework. System font stack avoids runtime font fetching. No server actions, API routes, SSR, dynamic rendering, or optimized Next.js images.

Frontend reads `NEXT_PUBLIC_API_URL`; this foundation does not require runtime API fetching. Static export writes to `out`.

### Backend

Bootstrap configures:

- Global prefix `api`
- `ValidationPipe` with whitelist, transform, and forbidden unknown properties
- CORS origin from `FRONTEND_URL`, falling back to `http://localhost:3000`
- Port from `BACKEND_PORT`, falling back to `3001`

Dedicated health module exposes `GET /api/health` and returns:

```json
{
  "status": "ok",
  "service": "spk-r5-parking-log-api"
}
```

Controller return type uses `HealthCheckResponse` from shared types.

### Shared Types

Package `@spk-r5-parking-log/shared-types` exports `ViolationStatus` and `HealthCheckResponse` from `src/index.ts`. TypeScript build produces JavaScript and declaration files in `dist`.

## Workspace Commands

Root scripts run development, build, lint, and formatting commands across packages. Package names remain exactly `frontend`, `backend`, and `@spk-r5-parking-log/shared-types` so filter commands resolve correctly.

## Testing and Verification

- Health endpoint behavior uses a test-first controller unit test.
- Generated scaffold and configuration are verified through package builds and lint.
- `pnpm install`, `pnpm build`, and `pnpm lint` must exit successfully.
- Development servers must start together through `pnpm dev`.
- HTTP checks must confirm frontend on port 3000 and exact health JSON on port 3001.

## Documentation

Root README covers overview, business purpose, stack, prerequisites, structure, setup, commands, service URLs, current scope, and future work. `.env.example`, `.gitignore`, and business rules match supplied requirements.

## Constraints

- Work directly in current `spk-r5-parking-log` root; never create a nested project root.
- Use Node.js 22 LTS and pnpm.
- Keep TypeScript strict and avoid unnecessary `any`.
- Add no database, Prisma, authentication, Docker, production secrets, or real violation logic.
- Add no dependency unrelated to this foundation.
