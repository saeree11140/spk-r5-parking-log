import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@spk-r5-parking-log/shared-types';
import { randomUUID } from 'node:crypto';

import { DomainError } from '../common/domain-error';
import { runSerializable } from '../common/serializable-transaction';
import { PrismaService } from '../database/prisma.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { LoginDto } from './dto/login.dto';
import {
  type AuthenticatedUser,
  type AuthTokens,
  type RequestMetadata,
} from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const LOCK_LIFETIME_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$OYYBMfn1aP+rktDHCPGRhg$eq+JyJwAUepnc4xmUiLXhF60WQqajDvjQRFqBSL6k/Y';

interface AuthUserRecord {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
  mustChangePassword: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(input: LoginDto, metadata: RequestMetadata): Promise<AuthTokens> {
    const username = input.username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { username } });
    const passwordMatches = await this.passwordService.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );
    const now = new Date();
    const isLocked = Boolean(user?.lockedUntil && user.lockedUntil > now);

    if (!user || !passwordMatches || !user.isActive || isLocked) {
      if (user?.isActive && !isLocked && !passwordMatches) {
        await this.registerFailedLogin(user.id, now);
      }
      throw this.invalidCredentials();
    }

    const sessionId = randomUUID();
    const sessionExpiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    const refresh = this.tokenService.createRefreshToken(sessionId);
    const authUser = this.toAuthUser(user);

    await runSerializable(this.prisma, async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash: refresh.hash,
          expiresAt: sessionExpiresAt,
          ...this.sessionMetadata(metadata),
        },
      });
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: user.id,
          action: 'LOGIN',
          after: { sessionId },
          actorType: 'USER',
          actorId: user.id,
          actorLabel: user.displayName,
        },
      });
    });

    return this.buildTokens(
      authUser,
      sessionId,
      sessionExpiresAt,
      refresh.value,
    );
  }

  async refresh(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<AuthTokens> {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw this.invalidRefresh();
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    });
    if (!session) {
      throw this.invalidRefresh();
    }

    const now = new Date();
    const usable =
      !session.revokedAt && session.expiresAt > now && session.user.isActive;
    const secretMatches = this.tokenService.matchesRefreshSecret(
      session.refreshTokenHash,
      parsed.secret,
    );

    if (!usable || !secretMatches) {
      await this.revokeSession(session.id, now);
      throw this.invalidRefresh();
    }

    const nextRefresh = this.tokenService.createRefreshToken(session.id);
    const updateResult = await this.prisma.$transaction((tx) =>
      tx.authSession.updateMany({
        where: {
          id: session.id,
          refreshTokenHash: session.refreshTokenHash,
          revokedAt: null,
        },
        data: {
          refreshTokenHash: nextRefresh.hash,
          lastUsedAt: now,
          ...this.sessionMetadata(metadata),
        },
      }),
    );

    if (updateResult.count !== 1) {
      await this.revokeSession(session.id, now);
      throw this.invalidRefresh();
    }

    return this.buildTokens(
      this.toAuthUser(session.user),
      session.id,
      session.expiresAt,
      nextRefresh.value,
    );
  }

  async logout(user: AuthenticatedUser): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: {
          id: user.sessionId,
          userId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: user.id,
          action: 'LOGOUT',
          after: { sessionId: user.sessionId },
          actorType: 'USER',
          actorId: user.id,
          actorLabel: user.displayName,
        },
      });
    });
  }

  me(user: AuthenticatedUser): AuthUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(
    user: AuthenticatedUser,
    input: ChangePasswordDto,
  ): Promise<AuthTokens> {
    if (input.newPassword !== input.confirmPassword) {
      throw new DomainError(
        400,
        'AUTH_PASSWORD_CONFIRMATION_MISMATCH',
        'Password confirmation does not match',
      );
    }

    const validation = this.passwordService.validate(input.newPassword);
    if (!validation.valid) {
      throw new DomainError(400, 'AUTH_PASSWORD_POLICY', validation.message);
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    const currentPasswordMatches =
      currentUser &&
      (await this.passwordService.verify(
        currentUser.passwordHash,
        input.currentPassword,
      ));
    if (!currentUser?.isActive || !currentPasswordMatches) {
      throw new DomainError(
        401,
        'AUTH_CURRENT_PASSWORD_INVALID',
        'Current password is incorrect',
      );
    }

    const now = new Date();
    const passwordHash = await this.passwordService.hash(input.newPassword);
    const refresh = this.tokenService.createRefreshToken(user.sessionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.authSession.updateMany({
        where: {
          userId: user.id,
          id: { not: user.sessionId },
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      const currentSession = await tx.authSession.updateMany({
        where: {
          id: user.sessionId,
          userId: user.id,
          revokedAt: null,
        },
        data: {
          refreshTokenHash: refresh.hash,
          lastUsedAt: now,
        },
      });
      if (currentSession.count !== 1) {
        throw this.invalidRefresh();
      }
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: user.id,
          action: 'CHANGE_PASSWORD',
          after: { sessionId: user.sessionId },
          actorType: 'USER',
          actorId: user.id,
          actorLabel: user.displayName,
        },
      });
    });

    return this.buildTokens(
      {
        ...this.toAuthUser(currentUser),
        mustChangePassword: false,
      },
      user.sessionId,
      user.sessionExpiresAt,
      refresh.value,
    );
  }

  private async registerFailedLogin(userId: string, now: Date): Promise<void> {
    await runSerializable(this.prisma, async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: {
          failedLoginAttempts: true,
          lockedUntil: true,
        },
      });
      if (!current) return;

      const lockExpired = Boolean(
        current.lockedUntil && current.lockedUntil <= now,
      );
      const failedLoginAttempts = lockExpired
        ? 1
        : current.failedLoginAttempts + 1;

      await tx.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts,
          lockedUntil:
            failedLoginAttempts >= MAX_LOGIN_ATTEMPTS
              ? new Date(now.getTime() + LOCK_LIFETIME_MS)
              : null,
        },
      });
    });
  }

  private async buildTokens(
    user: AuthUser,
    sessionId: string,
    sessionExpiresAt: Date,
    refreshToken: string,
  ): Promise<AuthTokens> {
    const accessToken = await this.tokenService.issueAccessToken(
      user,
      sessionId,
      sessionExpiresAt,
    );

    return {
      accessToken,
      refreshToken,
      csrfToken: this.tokenService.createCsrfToken(),
      accessExpiresAt: this.tokenService.accessExpiresAt(sessionExpiresAt),
      sessionExpiresAt,
      user,
    };
  }

  private toAuthUser(user: AuthUserRecord): AuthUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private sessionMetadata(metadata: RequestMetadata): {
    ipAddress: string | null;
    userAgent: string | null;
  } {
    return {
      ipAddress: metadata.ipAddress?.slice(0, 64) ?? null,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
    };
  }

  private parseRefreshToken(
    value: string,
  ): { sessionId: string; secret: string } | null {
    const parts = value.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }

    return { sessionId: parts[0], secret: parts[1] };
  }

  private async revokeSession(sessionId: string, now: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  private invalidCredentials(): DomainError {
    return new DomainError(
      401,
      'AUTH_INVALID_CREDENTIALS',
      'Invalid username or password',
    );
  }

  private invalidRefresh(): DomainError {
    return new DomainError(
      401,
      'AUTH_INVALID_REFRESH',
      'Refresh session is invalid',
    );
  }
}
