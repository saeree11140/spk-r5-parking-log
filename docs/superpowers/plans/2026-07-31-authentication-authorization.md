# Authentication และ Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม ADMIN/STAFF authentication, database-backed refresh session, JWT access token, RBAC, user management, audit actor และ frontend auth flow ให้ SPK R5 Parking Log

**Architecture:** Backend ออก JWT access cookie อายุ 15 นาทีและ opaque rotating refresh cookie ที่ hash เก็บใน PostgreSQL Session อายุสูงสุด 8 ชั่วโมง ทุก protected request ตรวจ JWT, Session และ User ปัจจุบันจาก DB. Frontend ใช้ Axios cookies/CSRF, single-flight refresh, Zustand auth state และ TanStack Query; Next.js ยัง static export และ Backend Guards เป็น security boundary.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, `@nestjs/jwt`, `@nestjs/throttler`, `argon2`, `cookie-parser`, Next.js 16 App Router static export, Axios, TanStack Query, Zustand, React Hook Form, Zod, Vitest/Testing Library, Jest/Supertest

## Global Constraints

- Source of truth: `docs/superpowers/specs/2026-07-27-authentication-authorization-design.md`
- Roles มีเพียง `ADMIN` และ `STAFF`
- Login ใช้ normalized lowercase `username + password`
- Password ยาว 12–128 ตัว มี uppercase, lowercase และ number; hash ด้วย Argon2id
- Login ผิด 5 ครั้งล็อก 15 นาที และ error ต้องไม่เปิดเผยว่า username มีจริงหรือไม่
- Access JWT อายุไม่เกิน 15 นาที; AuthSession/Refresh อายุสูงสุด 8 ชั่วโมงแบบ absolute
- Refresh token เป็น `sessionId.secret`, เก็บเฉพาะ HMAC hash, หมุนทุก refresh และ revoke เมื่อ reuse
- Access/Refresh cookies เป็น HttpOnly, SameSite=Lax; Production ต้อง Secure
- Mutation ตรวจ exact `Origin`, CSRF cookie และ `X-CSRF-Token`
- Production ต้อง expose Frontend และ Backend บน hostname เดียวกัน โดย Backend อยู่ `/api`; Development ใช้ `localhost` คนละ port ได้
- ผู้ใช้ใหม่/Reset Password ตั้ง `mustChangePassword=true`
- ห้ามปิดตัวเองและห้ามปิด/ลด role ADMIN คนสุดท้าย
- ห้ามเก็บ password/hash/token/CSRF ใน API response, frontend storage, AuditLog หรือ logs
- ทุก protected request ตรวจ Session และ User จาก DB; ห้ามเชื่อ role/status จาก JWT อย่างเดียว
- Frontend คง `output: "export"` และ routes บ้าน 164 หลัง
- Admin UI ใช้ metadata `noindex, nofollow, nocache`
- ไม่มี `sitemap.xml`
- Existing uncommitted root `package.json` และ `package-lock.json` เป็น user-owned; ห้ามแก้ ห้าม stage ห้าม commit
- ใช้ `pnpm` เท่านั้น; ห้ามใช้ `npm install`
- ทุก commit stage ด้วย explicit paths; ห้าม `git add .`

## Implementation References

- NestJS Authentication: `https://docs.nestjs.com/security/authentication`
- NestJS Authorization/RBAC: `https://docs.nestjs.com/security/authorization`
- NestJS Rate Limiting: `https://docs.nestjs.com/security/rate-limiting`
- node-argon2: `https://github.com/ranisalt/node-argon2`
- Next.js metadata: `https://nextjs.org/docs/app/getting-started/metadata-and-og-images`

---

### Task 1: Noindex Metadata Hardening

**Files:**
- Create: `apps/frontend/src/lib/admin-metadata.ts`
- Create: `apps/frontend/src/lib/admin-metadata.spec.ts`
- Modify: `apps/frontend/src/app/layout.tsx`

**Interfaces:**
- Produces: `ADMIN_ROBOTS_METADATA: NonNullable<Metadata["robots"]>`
- Consumed by: Root layout metadata and static export verification

- [ ] **Step 1: Write failing metadata tests**

```ts
// apps/frontend/src/lib/admin-metadata.spec.ts
import { describe, expect, it } from "vitest";
import { ADMIN_ROBOTS_METADATA } from "./admin-metadata";

describe("ADMIN_ROBOTS_METADATA", () => {
  it("prevents indexing, following and caching", () => {
    expect(ADMIN_ROBOTS_METADATA).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
    });
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/admin-metadata.spec.ts
```

Expected: FAIL because `./admin-metadata` does not exist.

- [ ] **Step 3: Implement metadata**

```ts
// apps/frontend/src/lib/admin-metadata.ts
import type { Metadata } from "next";

export const ADMIN_ROBOTS_METADATA: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
};
```

Update `layout.tsx`:

```ts
import { ADMIN_ROBOTS_METADATA } from "@/lib/admin-metadata";

export const metadata: Metadata = {
  title: "SPK R5 Parking Log | ระบบจัดการการจอดรถ",
  description: "ระบบจัดการ Violation และ Fine สำหรับหมู่บ้าน SPK R5",
  robots: ADMIN_ROBOTS_METADATA,
};
```

- [ ] **Step 4: Verify GREEN and static output**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/admin-metadata.spec.ts
pnpm --filter frontend build
rg -n 'name="robots" content="noindex, nofollow, nocache"' apps/frontend/out/index.html
test ! -e apps/frontend/out/sitemap.xml
```

Expected: tests PASS, build PASS, noindex assertion PASS, no sitemap.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/admin-metadata.ts apps/frontend/src/lib/admin-metadata.spec.ts apps/frontend/src/app/layout.tsx
git commit -m "feat: mark admin interface noindex"
```

---

### Task 2: Shared Auth Contracts และ Prisma Domain

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/test/auth-contracts.ts`
- Create: `packages/shared-types/tsconfig.test.json`
- Modify: `packages/shared-types/package.json`
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/202607310001_authentication_authorization/migration.sql`

**Interfaces:**
- Produces: `UserRole`, `AuthUser`, `UserSummary`, auth/user inputs and responses
- Produces: Prisma `User`, `AuthSession`, `UserRole`, extended `AuditAction`
- Consumed by: Backend Auth/Users modules and frontend auth/user features

- [ ] **Step 1: Write failing shared-contract test**

```ts
// packages/shared-types/test/auth-contracts.ts
import type {
  AuthUser,
  CreateUserInput,
  LoginInput,
  UserRole,
} from "../src/index";

const role: UserRole = "ADMIN";
const login: LoginInput = { username: "admin", password: "Password1234" };
const create: CreateUserInput = {
  username: "staff",
  displayName: "เจ้าหน้าที่",
  role: "STAFF",
  temporaryPassword: "Password1234",
};
const user: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "admin",
  displayName: "ผู้ดูแลระบบ",
  role,
  isActive: true,
  mustChangePassword: false,
};

void [login, create, user];
```

Add test config:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true, "rootDir": "." },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

Add package script:

```json
"test": "tsc -p tsconfig.test.json"
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter @spk-r5-parking-log/shared-types test
```

Expected: FAIL because auth types do not exist.

- [ ] **Step 3: Add shared contracts**

Add exact public types:

```ts
export type UserRole = "ADMIN" | "STAFF";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface UserSummary extends AuthUser {
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput { username: string; password: string }
export interface AuthResponse { user: AuthUser }
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export interface CreateUserInput {
  username: string;
  displayName: string;
  role: UserRole;
  temporaryPassword: string;
}
export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
}
export interface ResetPasswordInput { temporaryPassword: string }
export interface UsersResponse { users: UserSummary[] }
export interface UserResponse { user: UserSummary }
export interface LogoutResponse { success: true }
```

- [ ] **Step 4: Add Prisma models and migration**

Add to schema:

```prisma
enum UserRole {
  ADMIN
  STAFF

  @@map("user_role")
}

model User {
  id                  String        @id @default(uuid()) @db.Uuid
  username            String        @unique @db.VarChar(64)
  displayName         String        @map("display_name") @db.VarChar(255)
  passwordHash        String        @map("password_hash") @db.VarChar(255)
  role                UserRole
  isActive            Boolean       @default(true) @map("is_active")
  mustChangePassword  Boolean       @default(true) @map("must_change_password")
  failedLoginAttempts Int           @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?     @map("locked_until") @db.Timestamptz(3)
  passwordChangedAt   DateTime      @default(now()) @map("password_changed_at") @db.Timestamptz(3)
  createdAt           DateTime      @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt           DateTime      @updatedAt @map("updated_at") @db.Timestamptz(3)
  sessions            AuthSession[]

  @@map("users")
}

model AuthSession {
  id               String    @id @default(uuid()) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  refreshTokenHash String    @map("refresh_token_hash") @db.VarChar(255)
  expiresAt        DateTime  @map("expires_at") @db.Timestamptz(3)
  revokedAt        DateTime? @map("revoked_at") @db.Timestamptz(3)
  lastUsedAt       DateTime  @default(now()) @map("last_used_at") @db.Timestamptz(3)
  ipAddress        String?   @map("ip_address") @db.VarChar(64)
  userAgent        String?   @map("user_agent") @db.VarChar(512)
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt        DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([revokedAt])
  @@map("auth_sessions")
}
```

Extend `AuditAction` with:

```prisma
LOGIN
LOGOUT
CHANGE_PASSWORD
CREATE_USER
UPDATE_USER
RESET_PASSWORD
ACTIVATE
DEACTIVATE
```

Migration SQL must create matching PostgreSQL enums/tables/indexes and alter `audit_action` with these values. Do not alter parking rows.

- [ ] **Step 5: Generate and verify GREEN**

Run:

```bash
pnpm --filter @spk-r5-parking-log/shared-types test
pnpm --filter backend prisma:validate
pnpm --filter backend prisma:generate
pnpm db:migrate
pnpm db:status
```

Expected: type test PASS, Prisma valid, migration applied, DB current.

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/package.json packages/shared-types/src/index.ts packages/shared-types/test/auth-contracts.ts packages/shared-types/tsconfig.test.json apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/202607310001_authentication_authorization/migration.sql pnpm-lock.yaml
git commit -m "feat: add authentication data model"
```

---

### Task 3: Auth Environment, Password Service และ ADMIN Seed

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env.example`
- Create: `apps/backend/src/auth/auth-environment.ts`
- Create: `apps/backend/src/auth/auth-environment.spec.ts`
- Create: `apps/backend/src/auth/password.service.ts`
- Create: `apps/backend/src/auth/password.service.spec.ts`
- Create: `apps/backend/src/database/admin-seed.ts`
- Create: `apps/backend/src/database/admin-seed.spec.ts`
- Modify: `apps/backend/prisma/seed.ts`
- Create: `apps/backend/prisma/cleanup-auth-sessions.ts`

**Interfaces:**
- Produces: `requireAuthEnvironment(environment): AuthEnvironment`
- Produces: `PasswordService.validate/hash/verify`
- Produces: `seedAdmin(prisma, input): Promise<"created" | "existing">`
- Produces: `auth:sessions:cleanup` maintenance script

- [ ] **Step 1: Install backend-only dependencies**

Run:

```bash
pnpm --filter backend add @nestjs/jwt @nestjs/throttler argon2 cookie-parser
pnpm --filter backend add -D @types/cookie-parser
```

Confirm only `apps/backend/package.json` and `pnpm-lock.yaml` changed. Do not stage root `package.json` or `package-lock.json`.

- [ ] **Step 2: Write failing environment/password tests**

```ts
it('rejects secrets shorter than 32 bytes', () => {
  expect(() => requireAuthEnvironment({
    NODE_ENV: 'production',
    JWT_ACCESS_SECRET: 'short',
    AUTH_TOKEN_PEPPER: 'short',
    COOKIE_SECURE: 'true',
    FRONTEND_URL: 'https://admin.example.com',
  })).toThrow('JWT_ACCESS_SECRET must be at least 32 bytes');
});

it('requires uppercase, lowercase, number and 12-128 characters', () => {
  expect(service.validate('short')).toEqual({
    valid: false,
    message: 'รหัสผ่านต้องยาว 12–128 ตัว และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข',
  });
  expect(service.validate('StrongPassword123')).toEqual({ valid: true });
});

it('hashes with argon2id and verifies without exposing plaintext', async () => {
  const hash = await service.hash('StrongPassword123');
  expect(hash).toContain('$argon2id$');
  await expect(service.verify(hash, 'StrongPassword123')).resolves.toBe(true);
  await expect(service.verify(hash, 'WrongPassword123')).resolves.toBe(false);
});
```

- [ ] **Step 3: Run and verify RED**

Run:

```bash
pnpm --filter backend test -- auth-environment.spec.ts password.service.spec.ts --runInBand
```

Expected: FAIL because services do not exist.

- [ ] **Step 4: Implement environment and password boundaries**

```ts
export interface AuthEnvironment {
  jwtAccessSecret: string;
  tokenPepper: string;
  frontendUrl: string;
  cookieSecure: boolean;
}

export function requireAuthEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AuthEnvironment {
  const jwtAccessSecret = environment.JWT_ACCESS_SECRET?.trim() ?? '';
  const tokenPepper = environment.AUTH_TOKEN_PEPPER?.trim() ?? '';
  const frontendUrl = environment.FRONTEND_URL?.trim() ?? '';
  const cookieSecure = environment.COOKIE_SECURE === 'true';
  if (Buffer.byteLength(jwtAccessSecret) < 32)
    throw new Error('JWT_ACCESS_SECRET must be at least 32 bytes');
  if (Buffer.byteLength(tokenPepper) < 32)
    throw new Error('AUTH_TOKEN_PEPPER must be at least 32 bytes');
  if (!frontendUrl) throw new Error('Missing required environment variable: FRONTEND_URL');
  if (environment.NODE_ENV === 'production' && !cookieSecure)
    throw new Error('COOKIE_SECURE must be true in production');
  return { jwtAccessSecret, tokenPepper, frontendUrl, cookieSecure };
}
```

`PasswordService` must call `argon2.hash(password, { type: argon2.argon2id })`, use `argon2.verify`, and return the exact Thai policy message above.

- [ ] **Step 5: Write failing ADMIN seed tests**

```ts
it('creates the first admin with forced password change', async () => {
  const result = await seedAdmin(prisma, {
    username: ' Admin ',
    displayName: 'ผู้ดูแลระบบ',
    password: 'StrongPassword123',
  }, passwordService);
  expect(result).toBe('created');
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      username: 'admin',
      role: 'ADMIN',
      mustChangePassword: true,
    }),
  });
});

it('does not overwrite an existing account', async () => {
  prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
  await expect(seedAdmin(prisma, input, passwordService)).resolves.toBe('existing');
  expect(prisma.user.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Implement idempotent seed and cleanup**

`seedAdmin` must normalize username, validate/hash password only when creating, never update existing User. `seed.ts` must require:

```ts
const admin = {
  username: requireEnvironment('ADMIN_USERNAME'),
  password: requireEnvironment('ADMIN_PASSWORD'),
  displayName: requireEnvironment('ADMIN_DISPLAY_NAME'),
};
await seedHouses(prisma);
await seedAdmin(prisma, admin, new PasswordService());
```

Cleanup script:

```ts
await prisma.authSession.deleteMany({
  where: {
    OR: [
      { expiresAt: { lt: new Date() } },
      { revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    ],
  },
});
```

Add backend script:

```json
"auth:sessions:cleanup": "tsx prisma/cleanup-auth-sessions.ts"
```

Update `.env.example` with secret/admin variables and `COOKIE_SECURE=false`; values must be placeholders, not usable production secrets.

- [ ] **Step 7: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- auth-environment.spec.ts password.service.spec.ts admin-seed.spec.ts --runInBand
pnpm --filter backend lint
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml .env.example apps/backend/src/auth/auth-environment.ts apps/backend/src/auth/auth-environment.spec.ts apps/backend/src/auth/password.service.ts apps/backend/src/auth/password.service.spec.ts apps/backend/src/database/admin-seed.ts apps/backend/src/database/admin-seed.spec.ts apps/backend/prisma/seed.ts apps/backend/prisma/cleanup-auth-sessions.ts
git commit -m "feat: add password security and admin seed"
```

---

### Task 4: Token, Cookie และ Core Auth Service

**Files:**
- Create: `apps/backend/src/auth/auth.types.ts`
- Create: `apps/backend/src/auth/token.service.ts`
- Create: `apps/backend/src/auth/token.service.spec.ts`
- Create: `apps/backend/src/auth/auth-cookie.service.ts`
- Create: `apps/backend/src/auth/auth-cookie.service.spec.ts`
- Create: `apps/backend/src/auth/dto/login.dto.ts`
- Create: `apps/backend/src/auth/dto/change-password.dto.ts`
- Create: `apps/backend/src/auth/auth.service.ts`
- Create: `apps/backend/src/auth/auth.service.spec.ts`
- Create: `apps/backend/src/auth/auth.controller.ts`
- Create: `apps/backend/src/auth/auth.controller.spec.ts`
- Create: `apps/backend/src/auth/auth.module.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/main.ts`

**Interfaces:**
- Produces: `AuthenticatedUser`, `AccessClaims`, `RequestMetadata`
- Produces: `TokenService.issueAccessToken/createRefreshToken/verifyAccessToken/hashRefreshSecret`
- Produces: `AuthService.login/refresh/logout/me/changePassword`
- Produces API: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password`

- [ ] **Step 1: Write failing token tests**

```ts
it('creates sessionId.secret refresh tokens and stores only HMAC hash', () => {
  const token = service.createRefreshToken('00000000-0000-4000-8000-000000000001');
  const [sessionId, secret] = token.value.split('.');
  expect(sessionId).toBe('00000000-0000-4000-8000-000000000001');
  expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
  expect(token.hash).toBe(service.hashRefreshSecret(secret));
  expect(token.hash).not.toContain(secret);
});

it('caps access expiry at the session expiry', async () => {
  const sessionExpiresAt = new Date(Date.now() + 60_000);
  const jwt = await service.issueAccessToken(user, 'session-id', sessionExpiresAt);
  const claims = await service.verifyAccessToken(jwt);
  expect(claims.exp * 1000).toBeLessThanOrEqual(sessionExpiresAt.getTime());
});
```

- [ ] **Step 2: Run token tests and verify RED**

Run:

```bash
pnpm --filter backend test -- token.service.spec.ts --runInBand
```

Expected: FAIL because `TokenService` does not exist.

- [ ] **Step 3: Implement token service**

Use `JwtService` with HS256 and configured secret. Refresh hash:

```ts
hashRefreshSecret(secret: string): string {
  return createHmac('sha256', this.environment.tokenPepper)
    .update(secret)
    .digest('hex');
}

createRefreshToken(sessionId: string): { value: string; hash: string } {
  const secret = randomBytes(32).toString('base64url');
  return {
    value: `${sessionId}.${secret}`,
    hash: this.hashRefreshSecret(secret),
  };
}
```

Use `timingSafeEqual` after equal-length checks for refresh and CSRF comparisons.

- [ ] **Step 4: Write failing cookie tests**

```ts
it('sets HttpOnly access and refresh cookies with correct paths', () => {
  service.setAuthCookies(response, tokens);
  expect(response.cookie).toHaveBeenCalledWith('spk_r5_access', tokens.accessToken,
    expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api' }));
  expect(response.cookie).toHaveBeenCalledWith('spk_r5_refresh', tokens.refreshToken,
    expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api/auth' }));
  expect(response.cookie).toHaveBeenCalledWith('spk_r5_csrf', tokens.csrfToken,
    expect.objectContaining({ httpOnly: false, sameSite: 'lax', path: '/' }));
});
```

- [ ] **Step 5: Implement cookie service and bootstrap**

`AuthCookieService` must set max ages from token/session expiry and clear all three cookies using the same paths/options. In `main.ts`:

```ts
app.use(cookieParser());
app.enableCors({ origin: [authEnvironment.frontendUrl], credentials: true });
```

Do not use wildcard CORS.

- [ ] **Step 6: Write failing auth-service tests**

Cover exact behaviors:

```ts
it('returns generic credentials error and locks on fifth failure', async () => {
  await expect(service.login(badLogin, metadata)).rejects.toMatchObject({
    statusCode: 401,
    code: 'AUTH_INVALID_CREDENTIALS',
  });
  expect(prisma.user.update).toHaveBeenCalledWith({
    where: { id: user.id },
    data: expect.objectContaining({
      failedLoginAttempts: 5,
      lockedUntil: expect.any(Date),
    }),
  });
});

it('rotates refresh hash transactionally', async () => {
  const result = await service.refresh(refreshToken);
  expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
    where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
    data: expect.objectContaining({ refreshTokenHash: expect.any(String), lastUsedAt: expect.any(Date) }),
  });
  expect(result.refreshToken).not.toBe(refreshToken);
});

it('revokes other sessions when password changes', async () => {
  await service.changePassword(actor, input);
  expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
    where: { userId: actor.id, id: { not: actor.sessionId }, revokedAt: null },
    data: { revokedAt: expect.any(Date) },
  });
});
```

Also test inactive user, expired lock reset, expired session, refresh reuse, logout, wrong current password and password redaction.

- [ ] **Step 7: Implement AuthService and controller**

Method signatures:

```ts
login(input: LoginDto, metadata: RequestMetadata): Promise<AuthTokens>
refresh(refreshToken: string, metadata: RequestMetadata): Promise<AuthTokens>
logout(user: AuthenticatedUser): Promise<void>
me(user: AuthenticatedUser): AuthUser
changePassword(user: AuthenticatedUser, input: ChangePasswordDto): Promise<AuthTokens>
```

Controller sets/clears cookies and returns shared response shapes. It must never return raw tokens. Login success resets failed attempts and writes redacted LOGIN audit. Logout writes LOGOUT audit.

Login failure counter/lock update must run transactionally so concurrent failures cannot lose increments. Session metadata stores only:

```ts
{
  ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
  userAgent: metadata.userAgent?.slice(0, 512) ?? null,
}
```

Unknown username and wrong password return the same message and follow a dummy Argon2 verify path to reduce username timing differences.

- [ ] **Step 8: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- token.service.spec.ts auth-cookie.service.spec.ts auth.service.spec.ts auth.controller.spec.ts --runInBand
pnpm --filter backend lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/auth apps/backend/src/app.module.ts apps/backend/src/main.ts
git commit -m "feat: add token and session authentication"
```

---

### Task 5: Global Authentication, Password, Role, CSRF และ Rate Guards

**Files:**
- Create: `apps/backend/src/auth/decorators/public.decorator.ts`
- Create: `apps/backend/src/auth/decorators/roles.decorator.ts`
- Create: `apps/backend/src/auth/decorators/allow-password-change.decorator.ts`
- Create: `apps/backend/src/auth/decorators/current-user.decorator.ts`
- Create: `apps/backend/src/auth/guards/authentication.guard.ts`
- Create: `apps/backend/src/auth/guards/authentication.guard.spec.ts`
- Create: `apps/backend/src/auth/guards/password-change.guard.ts`
- Create: `apps/backend/src/auth/guards/password-change.guard.spec.ts`
- Create: `apps/backend/src/auth/guards/roles.guard.ts`
- Create: `apps/backend/src/auth/guards/roles.guard.spec.ts`
- Create: `apps/backend/src/auth/guards/csrf.guard.ts`
- Create: `apps/backend/src/auth/guards/csrf.guard.spec.ts`
- Modify: `apps/backend/src/auth/auth.module.ts`
- Modify: `apps/backend/src/auth/auth.controller.ts`
- Modify: `apps/backend/src/health/health.controller.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Produces decorators: `@Public()`, `@Roles(...roles)`, `@AllowPasswordChange()`, `@CurrentUser()`
- Produces global guards ordered: Throttler, CSRF, Authentication, PasswordChange, Roles
- Attaches: `request.user: AuthenticatedUser`

- [ ] **Step 1: Write failing guard tests**

```ts
it('loads current session and user instead of trusting JWT role', async () => {
  jwt.verifyAsync.mockResolvedValue({ sub: user.id, sid: session.id, role: 'ADMIN' });
  prisma.authSession.findFirst.mockResolvedValue({
    ...session,
    user: { ...user, role: 'STAFF', isActive: true },
  });
  await expect(guard.canActivate(context)).resolves.toBe(true);
  expect(request.user.role).toBe('STAFF');
});

it('blocks protected work until password is changed', () => {
  request.user.mustChangePassword = true;
  expect(() => guard.canActivate(context)).toThrow(
    expect.objectContaining({ code: 'AUTH_PASSWORD_CHANGE_REQUIRED' }),
  );
});

it('requires ADMIN metadata', () => {
  reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
  request.user.role = 'STAFF';
  expect(() => guard.canActivate(context)).toThrow(
    expect.objectContaining({ code: 'AUTH_FORBIDDEN' }),
  );
});

it('rejects mutation when origin or double-submit token differs', () => {
  request.method = 'POST';
  request.headers.origin = 'https://evil.example';
  expect(() => guard.canActivate(context)).toThrow(
    expect.objectContaining({ code: 'CSRF_INVALID' }),
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter backend test -- authentication.guard.spec.ts password-change.guard.spec.ts roles.guard.spec.ts csrf.guard.spec.ts --runInBand
```

Expected: FAIL because guards/decorators do not exist.

- [ ] **Step 3: Implement guards and decorators**

Authentication guard rules:

```ts
const claims = await tokenService.verifyAccessToken(request.cookies.spk_r5_access);
const session = await prisma.authSession.findFirst({
  where: {
    id: claims.sid,
    userId: claims.sub,
    revokedAt: null,
    expiresAt: { gt: new Date() },
    user: { isActive: true },
  },
  include: { user: true },
});
if (!session) throw new DomainError(401, 'AUTH_REQUIRED', 'Authentication required');
request.user = toAuthenticatedUser(session);
```

CSRF guard skips safe `GET/HEAD/OPTIONS`; Login requires exact Origin but no token; every other mutation requires exact Origin plus equal `spk_r5_csrf` cookie/header.

- [ ] **Step 4: Register guards and rate limits**

Configure named throttlers:

```ts
ThrottlerModule.forRoot([
  { name: 'default', ttl: 60_000, limit: 120 },
  { name: 'auth', ttl: 60_000, limit: 10, blockDuration: 60_000 },
])
```

Apply `@Throttle({ auth: { limit: 10, ttl: 60_000, blockDuration: 60_000 } })` to Login/Refresh. Register `APP_GUARD` providers in deterministic order. Mark Health, Login, Refresh public; mark Me, Change Password, Refresh and Logout allowed during forced password change.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- authentication.guard.spec.ts password-change.guard.spec.ts roles.guard.spec.ts csrf.guard.spec.ts --runInBand
pnpm --filter backend test --runInBand
```

Expected: targeted and existing backend suites PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/auth apps/backend/src/health/health.controller.ts apps/backend/src/app.module.ts
git commit -m "feat: enforce authentication and role guards"
```

---

### Task 6: ADMIN User Management API

**Files:**
- Create: `apps/backend/src/users/dto/create-user.dto.ts`
- Create: `apps/backend/src/users/dto/update-user.dto.ts`
- Create: `apps/backend/src/users/dto/reset-password.dto.ts`
- Create: `apps/backend/src/users/users.mapper.ts`
- Create: `apps/backend/src/users/users.service.ts`
- Create: `apps/backend/src/users/users.service.spec.ts`
- Create: `apps/backend/src/users/users.controller.ts`
- Create: `apps/backend/src/users/users.controller.spec.ts`
- Create: `apps/backend/src/users/users.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Interfaces:**
- Produces: `UsersService.list/create/update/resetPassword`
- Produces ADMIN API: `GET/POST /users`, `PATCH /users/:userId`, `POST /users/:userId/reset-password`
- Consumes: `PasswordService`, `AuthenticatedUser`, Prisma Serializable Transaction, AuditLog

- [ ] **Step 1: Write failing service tests**

```ts
it('creates normalized user with forced password change', async () => {
  await service.create(admin, {
    username: ' Staff.One ',
    displayName: 'เจ้าหน้าที่หนึ่ง',
    role: 'STAFF',
    temporaryPassword: 'StrongPassword123',
  });
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      username: 'staff.one',
      role: 'STAFF',
      mustChangePassword: true,
      passwordHash: 'argon-hash',
    }),
  });
});

it('rejects deactivating self', async () => {
  await expect(service.update(admin, admin.id, { isActive: false }))
    .rejects.toMatchObject({ code: 'USER_SELF_DEACTIVATE' });
});

it('protects the last admin inside a serializable transaction', async () => {
  tx.user.count.mockResolvedValue(1);
  await expect(service.update(admin, targetAdmin.id, { role: 'STAFF' }))
    .rejects.toMatchObject({ code: 'USER_LAST_ADMIN' });
  expect(tx.user.update).not.toHaveBeenCalled();
});

it('resets password and revokes all target sessions', async () => {
  await service.resetPassword(admin, staff.id, { temporaryPassword: 'StrongPassword123' });
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: staff.id },
    data: expect.objectContaining({ passwordHash: 'argon-hash', mustChangePassword: true }),
  });
  expect(tx.authSession.updateMany).toHaveBeenCalledWith({
    where: { userId: staff.id, revokedAt: null },
    data: { revokedAt: expect.any(Date) },
  });
});
```

Also test username duplicate `USERNAME_TAKEN`, inactive/active audit action, no password in mapper, deterministic username sort.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter backend test -- users.service.spec.ts users.controller.spec.ts --runInBand
```

Expected: FAIL because Users module does not exist.

- [ ] **Step 3: Implement DTOs, mapper and service**

DTO validation must enforce:

```ts
@Matches(/^[a-z0-9._-]{3,64}$/)
username!: string;

@IsIn(['ADMIN', 'STAFF'])
role!: UserRole;
```

Password validation must call shared `PasswordService.validate`; do not duplicate regex in service/controller. All last-admin checks and writes run with existing Serializable Transaction helper and retry behavior.

Method signatures:

```ts
list(): Promise<UsersResponse>
create(actor: AuthenticatedUser, input: CreateUserDto): Promise<UserResponse>
update(actor: AuthenticatedUser, userId: string, input: UpdateUserDto): Promise<UserResponse>
resetPassword(actor: AuthenticatedUser, userId: string, input: ResetPasswordDto): Promise<UserResponse>
```

- [ ] **Step 4: Implement controller and ADMIN guard**

```ts
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  @Get() list() {}
  @Post() create(@CurrentUser() actor, @Body() input) {}
  @Patch(':userId') update(@CurrentUser() actor, @Param('userId', new ParseUUIDPipe()) userId, @Body() input) {}
  @Post(':userId/reset-password') resetPassword(...) {}
}
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- users.service.spec.ts users.controller.spec.ts --runInBand
pnpm --filter backend test --runInBand
pnpm --filter backend lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/users apps/backend/src/app.module.ts
git commit -m "feat: add admin user management"
```

---

### Task 7: Protect Parking API และ Propagate Audit Actor

**Files:**
- Modify: `apps/backend/src/audit/audit-log.ts`
- Modify: `apps/backend/src/audit/audit-log.spec.ts`
- Modify: `apps/backend/src/violations/violations.controller.ts`
- Modify: `apps/backend/src/violations/violations.controller.spec.ts`
- Modify: `apps/backend/src/violations/violations.service.ts`
- Modify: `apps/backend/src/violations/violations.service.spec.ts`
- Modify: `apps/backend/src/violations/violation-resequence.ts`
- Modify: `apps/backend/src/violations/violation-resequence.spec.ts`
- Modify: `apps/backend/src/payments/payments.controller.ts`
- Modify: `apps/backend/src/payments/payments.controller.spec.ts`
- Modify: `apps/backend/src/payments/payments.service.ts`
- Modify: `apps/backend/src/payments/payments.service.spec.ts`
- Modify: `apps/backend/src/houses/houses.controller.ts`
- Modify: `apps/backend/src/houses/houses.controller.spec.ts`

**Interfaces:**
- Produces: `AuditActor`, `SYSTEM_ACTOR`, `toAuditActor(user)`
- Changes parking mutation signatures to accept `actor: AuditActor`
- Requires authentication for reads; requires `STAFF|ADMIN` for mutations

- [ ] **Step 1: Write failing actor tests**

```ts
it('records the authenticated user actor', async () => {
  const actor = {
    actorType: 'USER' as const,
    actorId: '00000000-0000-4000-8000-000000000001',
    actorLabel: 'เจ้าหน้าที่หนึ่ง',
  };
  await writeAudit(tx, 'ParkingViolation', violationId, 'CREATE', null, after, actor);
  expect(create).toHaveBeenCalledWith({
    data: expect.objectContaining(actor),
  });
});

it('passes current user into violation service', async () => {
  await controller.create('R5-001', dto, authenticatedUser);
  expect(service.create).toHaveBeenCalledWith(
    'R5-001',
    dto,
    expect.objectContaining({ actorType: 'USER', actorId: authenticatedUser.id }),
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter backend test -- audit-log.spec.ts violations.controller.spec.ts payments.controller.spec.ts --runInBand
```

Expected: FAIL because actor parameter/current-user flow is absent.

- [ ] **Step 3: Implement audit actor propagation**

```ts
export interface AuditActor {
  actorType: 'SYSTEM' | 'USER';
  actorId: string | null;
  actorLabel: string;
}

export const SYSTEM_ACTOR: AuditActor = {
  actorType: 'SYSTEM',
  actorId: null,
  actorLabel: 'core-api',
};
```

Controllers receive `@CurrentUser()` and convert to actor. Services and resequence helpers pass the same actor to every related audit write. Existing system-only callers default explicitly to `SYSTEM_ACTOR`; do not use an implicit default that hides missing user propagation.

- [ ] **Step 4: Apply route roles**

- House `GET` endpoints: authenticated, no `@Roles`
- Violation/Payment mutation controllers: `@Roles('ADMIN', 'STAFF')`
- No parking route is `@Public`

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter backend test -- audit-log.spec.ts violations.controller.spec.ts violations.service.spec.ts violation-resequence.spec.ts payments.controller.spec.ts payments.service.spec.ts houses.controller.spec.ts --runInBand
pnpm --filter backend test --runInBand
```

Expected: PASS and audit expectations use USER actor for request-driven mutations.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/audit apps/backend/src/violations apps/backend/src/payments apps/backend/src/houses
git commit -m "feat: protect parking api and record user actors"
```

---

### Task 8: Backend Auth E2E

**Files:**
- Create: `apps/backend/test/auth.e2e-spec.ts`
- Create: `apps/backend/test/auth-test-helpers.ts`
- Create: `apps/backend/test/set-auth-env.ts`
- Modify: `apps/backend/test/core-parking-api.e2e-spec.ts`
- Modify: `apps/backend/test/jest-e2e.json`

**Interfaces:**
- Produces: cookie-aware `loginAs(role)`, `csrfFromCookies`, test-user cleanup helpers
- Verifies all public/protected/ADMIN/STAFF boundaries against real PostgreSQL

- [ ] **Step 1: Write E2E tests before changing helpers**

Required cases:

```ts
it('rejects house data without authentication', () =>
  request(app.getHttpServer())
    .get('/api/houses')
    .expect(401)
    .expect(({ body }) => expect(body.code).toBe('AUTH_REQUIRED')));

it('logs in, sets secure-boundary cookies and returns current user', async () => {
  const agent = request.agent(app.getHttpServer());
  const login = await agent.post('/api/auth/login')
    .set('Origin', frontendUrl)
    .send({ username: admin.username, password: admin.password })
    .expect(201);
  expect(login.headers['set-cookie'].join(';')).toContain('spk_r5_access=');
  expect(login.headers['set-cookie'].join(';')).toContain('HttpOnly');
  await agent.get('/api/auth/me').expect(200);
});

it('rotates refresh token and rejects reuse', async () => {
  const first = await loginAs('ADMIN');
  const refreshed = await refresh(first);
  expect(refreshed.refreshCookie).not.toBe(first.refreshCookie);
  await refreshWithCookies(first.cookies).then((response) => {
    expect(response.status).toBe(401);
  });
});

it('allows STAFF parking mutation but denies user management', async () => {
  const staff = await loginAs('STAFF');
  await staff.agent.post('/api/houses/R5-001/violations')
    .set('Origin', frontendUrl)
    .set('X-CSRF-Token', staff.csrf)
    .send({ occurredAt: '2026-07-31T10:00:00+07:00' })
    .expect(201);
  await staff.agent.get('/api/users').expect(403);
});
```

Also test forced password change, 5-attempt lock, CSRF failure, logout, password-change session revoke, last-admin rule, inactive user, no secrets in responses, and Parking AuditLog actor.

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter backend test:e2e -- auth.e2e-spec.ts --runInBand
```

Expected: FAIL until helpers/setup and remaining integration gaps are implemented.

- [ ] **Step 3: Implement isolated auth fixtures**

Helpers create unique test users with `PasswordService`, delete only their AuthSession/AuditLog/User rows in `afterEach`, and never reset House/Violation production-like seed data globally. Update old parking E2E requests to authenticate and send CSRF.

`set-auth-env.ts` must set deterministic test-only values before Nest modules load:

```ts
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-32-bytes-minimum';
process.env.AUTH_TOKEN_PEPPER = 'test-auth-token-pepper-32-bytes-minimum';
process.env.COOKIE_SECURE = 'false';
```

Reference it from `jest-e2e.json`:

```json
"setupFiles": ["<rootDir>/set-auth-env.ts"]
```

- [ ] **Step 4: Run complete backend verification**

Run:

```bash
pnpm --filter backend test --runInBand
pnpm --filter backend test:e2e --runInBand
pnpm --filter backend lint
pnpm --filter backend build
```

Expected: all unit/E2E/lint/build PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/test
git commit -m "test: cover authentication authorization e2e"
```

---

### Task 9: Frontend Auth Transport, Store และ Provider

**Files:**
- Create: `apps/frontend/src/lib/api/csrf.ts`
- Create: `apps/frontend/src/lib/api/csrf.spec.ts`
- Modify: `apps/frontend/src/lib/api/client.ts`
- Modify: `apps/frontend/src/lib/api/client.spec.ts`
- Create: `apps/frontend/src/lib/api/auth-api.ts`
- Create: `apps/frontend/src/lib/api/auth-api.spec.ts`
- Modify: `apps/frontend/src/lib/query/keys.ts`
- Create: `apps/frontend/src/stores/auth-store.ts`
- Create: `apps/frontend/src/stores/auth-store.spec.ts`
- Create: `apps/frontend/src/features/auth/auth-provider.tsx`
- Create: `apps/frontend/src/features/auth/auth-provider.spec.tsx`
- Modify: `apps/frontend/src/app/providers.tsx`
- Modify: `apps/frontend/src/test/render.tsx`
- Modify: `apps/frontend/src/test/fixtures.ts`

**Interfaces:**
- Produces: `readCsrfCookie()`
- Produces: `authApi.login/refresh/logout/me/changePassword`
- Produces: `useAuthStore` with `status`, `user`, `setAuthenticated`, `setUnauthenticated`
- Produces: single-flight refresh and one retry in Axios
- Produces: `AuthProvider`

- [ ] **Step 1: Write failing CSRF/client tests**

```ts
it('reads and decodes spk_r5_csrf only', () => {
  document.cookie = 'other=x';
  document.cookie = 'spk_r5_csrf=abc%20123';
  expect(readCsrfCookie()).toBe('abc 123');
});

it('sends credentials and CSRF header for mutations', async () => {
  await apiClient.post('/auth/logout', {});
  expect(mock.history.post[0].withCredentials).toBe(true);
  expect(mock.history.post[0].headers?.['X-CSRF-Token']).toBe('csrf-token');
});

it('uses one refresh for concurrent 401s and retries each request once', async () => {
  await Promise.all([apiClient.get('/houses'), apiClient.get('/auth/me')]);
  expect(refreshMock).toHaveBeenCalledTimes(1);
  expect(houseMock).toHaveBeenCalledTimes(2);
  expect(meMock).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/csrf.spec.ts src/lib/api/client.spec.ts src/lib/api/auth-api.spec.ts
```

Expected: FAIL because CSRF/auth/single-flight behavior is absent.

- [ ] **Step 3: Implement transport**

Set:

```ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api",
  withCredentials: true,
  timeout: 10_000,
});
```

Request interceptor adds CSRF only for `POST/PATCH/PUT/DELETE`. Response interceptor:

- detects API `401 AUTH_REQUIRED`
- excludes `/auth/login` and `/auth/refresh`
- skips config marked `_authRetried`
- shares module-level `refreshPromise`
- refreshes with a separate credentials-enabled Axios instance
- retries original request once
- calls registered auth-expired handler on refresh failure
- normalizes final error using existing `ApiError`

- [ ] **Step 4: Write failing store/provider tests**

```ts
it('stores user but never tokens', () => {
  useAuthStore.getState().setAuthenticated(adminUser);
  expect(useAuthStore.getState()).toMatchObject({
    status: 'authenticated',
    user: adminUser,
  });
  expect(JSON.stringify(useAuthStore.getState())).not.toContain('token');
});

it('bootstraps current user without flashing protected children', async () => {
  authApi.me.mockReturnValue(new Promise(() => undefined));
  renderWithQueryClient(<AuthProvider><div>protected</div></AuthProvider>);
  expect(screen.queryByText('protected')).not.toBeInTheDocument();
  expect(screen.getByText('กำลังตรวจสอบสิทธิ์')).toBeInTheDocument();
});
```

- [ ] **Step 5: Implement auth API/store/provider**

Auth store:

```ts
type AuthStatus = "checking" | "authenticated" | "unauthenticated";
interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  setAuthenticated(user: AuthUser): void;
  setUnauthenticated(): void;
  setChecking(): void;
}
```

`AuthProvider` owns `/auth/me` query, updates store, registers the auth-expired callback and invalidates auth/user/parking queries on logout.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/csrf.spec.ts src/lib/api/client.spec.ts src/lib/api/auth-api.spec.ts src/stores/auth-store.spec.ts src/features/auth/auth-provider.spec.tsx
pnpm --filter frontend typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/api apps/frontend/src/lib/query/keys.ts apps/frontend/src/stores/auth-store.ts apps/frontend/src/stores/auth-store.spec.ts apps/frontend/src/features/auth/auth-provider.tsx apps/frontend/src/features/auth/auth-provider.spec.tsx apps/frontend/src/app/providers.tsx apps/frontend/src/test/render.tsx apps/frontend/src/test/fixtures.ts
git commit -m "feat: add frontend authentication state"
```

---

### Task 10: Login, Forced Password Change และ Protected App Shell

**Files:**
- Create: `apps/frontend/src/lib/forms/auth-schemas.ts`
- Create: `apps/frontend/src/lib/forms/auth-schemas.spec.ts`
- Create: `apps/frontend/src/features/auth/login-page.tsx`
- Create: `apps/frontend/src/features/auth/login-page.spec.tsx`
- Create: `apps/frontend/src/features/auth/change-password-page.tsx`
- Create: `apps/frontend/src/features/auth/change-password-page.spec.tsx`
- Create: `apps/frontend/src/features/auth/auth-gate.tsx`
- Create: `apps/frontend/src/features/auth/auth-gate.spec.tsx`
- Create: `apps/frontend/src/app/login/page.tsx`
- Create: `apps/frontend/src/app/change-password/page.tsx`
- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/components/layout/app-shell.tsx`
- Create: `apps/frontend/src/components/layout/app-shell.spec.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Produces: `loginSchema`, `changePasswordSchema`
- Produces routes: `/login`, `/change-password`
- Produces `AuthGate` redirect matrix
- AppShell consumes `AuthUser`, shows role/logout and ADMIN-only navigation

- [ ] **Step 1: Write failing schema tests**

```ts
it('normalizes username and rejects weak password', () => {
  expect(loginSchema.parse({
    username: ' Admin ',
    password: 'StrongPassword123',
  }).username).toBe('admin');
  expect(() => changePasswordSchema.parse({
    currentPassword: 'CurrentPassword123',
    newPassword: 'weak',
    confirmPassword: 'weak',
  })).toThrow();
});

it('requires matching confirmation', () => {
  expect(() => changePasswordSchema.parse({
    currentPassword: 'CurrentPassword123',
    newPassword: 'StrongPassword123',
    confirmPassword: 'DifferentPassword123',
  })).toThrow('รหัสผ่านใหม่ไม่ตรงกัน');
});
```

- [ ] **Step 2: Write failing page/gate tests**

```tsx
it('shows generic login error without leaking account state', async () => {
  authApi.login.mockRejectedValue(new ApiError(
    'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'AUTH_INVALID_CREDENTIALS',
    401,
  ));
  renderWithQueryClient(<LoginPage />);
  await user.type(screen.getByLabelText('ชื่อผู้ใช้'), 'admin');
  await user.type(screen.getByLabelText('รหัสผ่าน'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  );
});

it('sends forced-change users only to change-password', () => {
  useAuthStore.setState({ status: 'authenticated', user: forcedUser });
  render(<AuthGate><div>protected</div></AuthGate>);
  expect(router.replace).toHaveBeenCalledWith('/change-password');
});
```

- [ ] **Step 3: Run and verify RED**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/forms/auth-schemas.spec.ts src/features/auth/login-page.spec.tsx src/features/auth/change-password-page.spec.tsx src/features/auth/auth-gate.spec.tsx src/components/layout/app-shell.spec.tsx
```

Expected: FAIL because auth UI does not exist.

- [ ] **Step 4: Implement forms and redirect matrix**

Redirect rules:

```text
checking: bootstrap screen
unauthenticated + /login: render login
unauthenticated + other route: router.replace("/login")
authenticated + mustChangePassword + /change-password: render change form
authenticated + mustChangePassword + other route: router.replace("/change-password")
authenticated + no force + /login|/change-password: router.replace("/")
authenticated + no force + protected route: render AppShell
```

Forms use React Hook Form + Zod resolver. Successful Login updates auth query/store. Successful password change replaces user, clears must-change state and routes `/`.

- [ ] **Step 5: Update shell**

- Add `Users` navigation only for ADMIN
- Show displayName and role badge
- Logout mutation disables button, clears auth state and routes `/login`
- Public `/login` has no sidebar/mobile app header
- Preserve existing desktop-first responsive layout and focus styles

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/forms/auth-schemas.spec.ts src/features/auth/login-page.spec.tsx src/features/auth/change-password-page.spec.tsx src/features/auth/auth-gate.spec.tsx src/components/layout/app-shell.spec.tsx
pnpm --filter frontend typecheck
pnpm --filter frontend lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/forms/auth-schemas.ts apps/frontend/src/lib/forms/auth-schemas.spec.ts apps/frontend/src/features/auth apps/frontend/src/app/login apps/frontend/src/app/change-password apps/frontend/src/app/layout.tsx apps/frontend/src/components/layout/app-shell.tsx apps/frontend/src/components/layout/app-shell.spec.tsx apps/frontend/src/app/globals.css
git commit -m "feat: add login and protected app shell"
```

---

### Task 11: ADMIN User Management Frontend

**Files:**
- Create: `apps/frontend/src/lib/api/users-api.ts`
- Create: `apps/frontend/src/lib/api/users-api.spec.ts`
- Create: `apps/frontend/src/lib/forms/user-schemas.ts`
- Create: `apps/frontend/src/lib/forms/user-schemas.spec.ts`
- Create: `apps/frontend/src/features/users/users-page.tsx`
- Create: `apps/frontend/src/features/users/users-page.spec.tsx`
- Create: `apps/frontend/src/features/users/user-table.tsx`
- Create: `apps/frontend/src/features/users/create-user-modal.tsx`
- Create: `apps/frontend/src/features/users/edit-user-modal.tsx`
- Create: `apps/frontend/src/features/users/reset-password-modal.tsx`
- Create: `apps/frontend/src/features/users/user-modals.spec.tsx`
- Create: `apps/frontend/src/app/users/page.tsx`
- Modify: `apps/frontend/src/lib/query/keys.ts`
- Modify: `apps/frontend/src/app/globals.css`

**Interfaces:**
- Produces: `usersApi.list/create/update/resetPassword`
- Produces: `userKeys.all`
- Produces ADMIN-only `/users` page and accessible CRUD modals

- [ ] **Step 1: Write failing API/schema tests**

```ts
it('calls ADMIN user endpoints with typed payloads', async () => {
  await usersApi.create(createInput);
  expect(mock.history.post[0].url).toBe('/users');
  await usersApi.update(userId, { isActive: false });
  expect(mock.history.patch[0].url).toBe(`/users/${userId}`);
  await usersApi.resetPassword(userId, { temporaryPassword: 'StrongPassword123' });
  expect(mock.history.post[1].url).toBe(`/users/${userId}/reset-password`);
});

it('normalizes usernames and enforces temporary password policy', () => {
  const parsed = createUserSchema.parse({
    username: ' Staff.One ',
    displayName: 'เจ้าหน้าที่หนึ่ง',
    role: 'STAFF',
    temporaryPassword: 'StrongPassword123',
  });
  expect(parsed.username).toBe('staff.one');
});
```

- [ ] **Step 2: Write failing UI tests**

Required assertions:

```tsx
it('lists status, role and forced-change state', async () => {
  renderWithQueryClient(<UsersPage />);
  expect(await screen.findByText('staff.one')).toBeInTheDocument();
  expect(screen.getByText('STAFF')).toBeInTheDocument();
  expect(screen.getByText('รอเปลี่ยนรหัสผ่าน')).toBeInTheDocument();
});

it('invalidates user query after create', async () => {
  await submitCreateUser();
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: userKeys.all });
});

it('does not offer deactivate for current admin', async () => {
  renderWithQueryClient(<UsersPage />, { currentUser: adminUser });
  expect(screen.queryByRole('button', { name: `ปิดบัญชี ${adminUser.username}` }))
    .not.toBeInTheDocument();
});

it('redirects STAFF away from the users route without requesting user data', () => {
  useAuthStore.setState({ status: 'authenticated', user: staffUser });
  renderWithQueryClient(<UsersPage />);
  expect(router.replace).toHaveBeenCalledWith('/');
  expect(usersApi.list).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Run and verify RED**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/users-api.spec.ts src/lib/forms/user-schemas.spec.ts src/features/users/users-page.spec.tsx src/features/users/user-modals.spec.tsx
```

Expected: FAIL because user management frontend does not exist.

- [ ] **Step 4: Implement user API, forms and page**

Use TanStack Query:

```ts
useQuery({ queryKey: userKeys.all, queryFn: usersApi.list });
useMutation({
  mutationFn: usersApi.create,
  onSuccess: async () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
});
```

UI requirements:

- Desktop table: username, display name, role, active status, must-change status, actions
- Mobile horizontal table wrapper without root overflow
- Create/Edit/Reset modals reuse accessible `Modal`
- Temporary password fields use `type="password"` and autocomplete values
- API errors use existing safe Feedback component
- `UsersPage` performs role check before enabling its query; STAFF direct route redirects `/` and never requests User list

- [ ] **Step 5: Verify GREEN**

Run:

```bash
pnpm --filter frontend test:run -- src/lib/api/users-api.spec.ts src/lib/forms/user-schemas.spec.ts src/features/users/users-page.spec.tsx src/features/users/user-modals.spec.tsx
pnpm --filter frontend test:run
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend build
```

Expected: frontend suites PASS and static build includes `/users`, `/login`, `/change-password` and 164 house routes.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/api/users-api.ts apps/frontend/src/lib/api/users-api.spec.ts apps/frontend/src/lib/forms/user-schemas.ts apps/frontend/src/lib/forms/user-schemas.spec.ts apps/frontend/src/features/users apps/frontend/src/app/users apps/frontend/src/lib/query/keys.ts apps/frontend/src/app/globals.css
git commit -m "feat: add admin user management interface"
```

---

### Task 12: Documentation, Browser Acceptance และ Full Verification

**Files:**
- Modify: `README.md`
- Modify: `apps/frontend/README.md`
- Modify: `docs/business-rules.md`

**Interfaces:**
- Documents: environment setup, first ADMIN seed, auth commands, roles, session behavior and offline payment scope
- Verifies: complete system against approved spec

- [ ] **Step 1: Update documentation**

Document exact local setup:

```bash
cp .env.example .env
# Set JWT_ACCESS_SECRET, AUTH_TOKEN_PEPPER, ADMIN_USERNAME,
# ADMIN_PASSWORD, ADMIN_DISPLAY_NAME
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Document:

- Frontend `http://localhost:3000`
- Backend `http://localhost:3001/api`
- first Login forces password change
- ADMIN/STAFF permission matrix
- Access 15 minutes, Session/Refresh 8 hours
- `pnpm --filter backend auth:sessions:cleanup`
- No online payment
- noindex เป็น crawler hint ไม่ใช่ access control

- [ ] **Step 2: Run full automated verification**

Run:

```bash
pnpm --filter @spk-r5-parking-log/shared-types test
pnpm --filter backend test --runInBand
pnpm --filter backend test:e2e --runInBand
pnpm --filter frontend test:run
pnpm --recursive lint
pnpm --recursive build
git diff --check
test "$(find apps/frontend/out/houses -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" = "164"
rg -n 'name="robots" content="noindex, nofollow, nocache"' apps/frontend/out/index.html
```

Expected: all commands PASS, 164 house directories and correct noindex.

- [ ] **Step 3: Browser acceptance with real PostgreSQL**

Start:

```bash
pnpm db:up
FRONTEND_URL=http://localhost:3000 pnpm dev:backend
pnpm dev:frontend
```

Verify at 1440×900 and 390×844:

1. Unauthenticated `/` and direct `/houses/R5-164` go Login without protected content flash.
2. Wrong Login shows generic error; five wrong attempts lock 15 minutes.
3. Seed ADMIN Login goes forced Change Password.
4. New password Login/refresh/logout works.
5. ADMIN creates STAFF, edits display name/role, deactivates/reactivates and resets password.
6. ADMIN cannot deactivate self or last ADMIN.
7. STAFF can read houses and run a controlled parking mutation; STAFF cannot see/open `/users`.
8. Access expiry triggers one refresh and preserves current page/form state.
9. Keyboard focus, Escape, focus return and reduced-motion behavior work.
10. Root document has no horizontal overflow at mobile size.
11. Browser logs contain no app error, password or tokens.
12. Delete only browser-created test User/Session/Audit rows through direct test cleanup; do not delete parking history created for acceptance unless it was explicitly marked as test data and cleanup is defined.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md apps/frontend/README.md docs/business-rules.md
git commit -m "docs: document authentication operations"
```

- [ ] **Step 5: Final repository audit**

Run:

```bash
git status --short
git log --oneline --decorate -15
git diff main...HEAD --stat
```

Expected:

- Only user-owned root `package.json` and `package-lock.json` may remain uncommitted.
- No auth implementation file uncommitted.
- No secret/password/token committed.
- Every task has a focused commit.

Use `superpowers:verification-before-completion`, then `superpowers:requesting-code-review`, then `superpowers:finishing-a-development-branch`.
