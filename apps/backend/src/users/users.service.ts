import { Injectable } from '@nestjs/common';
import type {
  UserResponse,
  UsersResponse,
} from '@spk-r5-parking-log/shared-types';

import type { AuthenticatedUser } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { DomainError } from '../common/domain-error';
import { runSerializable } from '../common/serializable-transaction';
import { PrismaService } from '../database/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { toUserSummary } from './users.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(): Promise<UsersResponse> {
    const users = await this.prisma.user.findMany({
      orderBy: { username: 'asc' },
    });

    return { users: users.map(toUserSummary) };
  }

  async create(
    actor: AuthenticatedUser,
    input: CreateUserDto,
  ): Promise<UserResponse> {
    const username = input.username.trim().toLowerCase();
    this.requireValidPassword(input.temporaryPassword);
    const passwordHash = await this.passwordService.hash(
      input.temporaryPassword,
    );

    try {
      const user = await runSerializable(this.prisma, async (tx) => {
        const created = await tx.user.create({
          data: {
            username,
            displayName: input.displayName.trim(),
            role: input.role,
            passwordHash,
            mustChangePassword: true,
          },
        });
        await tx.auditLog.create({
          data: {
            entityType: 'User',
            entityId: created.id,
            action: 'CREATE_USER',
            after: this.auditUser(created),
            actorType: 'USER',
            actorId: actor.id,
            actorLabel: actor.displayName,
          },
        });

        return created;
      });

      return { user: toUserSummary(user) };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new DomainError(
          409,
          'USERNAME_TAKEN',
          'Username is already in use',
        );
      }
      throw error;
    }
  }

  async update(
    actor: AuthenticatedUser,
    userId: string,
    input: UpdateUserDto,
  ): Promise<UserResponse> {
    if (actor.id === userId && input.isActive === false) {
      throw new DomainError(
        409,
        'USER_SELF_DEACTIVATE',
        'Cannot deactivate your own account',
      );
    }

    const user = await runSerializable(this.prisma, async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new DomainError(404, 'USER_NOT_FOUND', 'User not found');
      }

      const removesActiveAdmin =
        current.role === 'ADMIN' &&
        current.isActive &&
        (input.role === 'STAFF' || input.isActive === false);
      if (removesActiveAdmin) {
        const activeAdminCount = await tx.user.count({
          where: { role: 'ADMIN', isActive: true },
        });
        if (activeAdminCount <= 1) {
          throw new DomainError(
            409,
            'USER_LAST_ADMIN',
            'Cannot remove the last active admin',
          );
        }
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          displayName: input.displayName?.trim(),
          role: input.role,
          isActive: input.isActive,
        },
      });
      if (current.isActive && input.isActive === false) {
        await tx.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: userId,
          action: this.updateAction(current.isActive, input.isActive),
          before: this.auditUser(current),
          after: this.auditUser(updated),
          actorType: 'USER',
          actorId: actor.id,
          actorLabel: actor.displayName,
        },
      });

      return updated;
    });

    return { user: toUserSummary(user) };
  }

  async resetPassword(
    actor: AuthenticatedUser,
    userId: string,
    input: ResetPasswordDto,
  ): Promise<UserResponse> {
    this.requireValidPassword(input.temporaryPassword);
    const passwordHash = await this.passwordService.hash(
      input.temporaryPassword,
    );
    const now = new Date();

    const user = await runSerializable(this.prisma, async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new DomainError(404, 'USER_NOT_FOUND', 'User not found');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: userId,
          action: 'RESET_PASSWORD',
          after: {
            mustChangePassword: true,
            sessionsRevoked: true,
          },
          actorType: 'USER',
          actorId: actor.id,
          actorLabel: actor.displayName,
        },
      });

      return updated;
    });

    return { user: toUserSummary(user) };
  }

  private requireValidPassword(password: string): void {
    const validation = this.passwordService.validate(password);
    if (!validation.valid) {
      throw new DomainError(400, 'AUTH_PASSWORD_POLICY', validation.message);
    }
  }

  private updateAction(
    wasActive: boolean,
    isActive: boolean | undefined,
  ): 'UPDATE_USER' | 'ACTIVATE' | 'DEACTIVATE' {
    if (!wasActive && isActive === true) return 'ACTIVATE';
    if (wasActive && isActive === false) return 'DEACTIVATE';

    return 'UPDATE_USER';
  }

  private auditUser(user: {
    username: string;
    displayName: string;
    role: 'ADMIN' | 'STAFF';
    isActive: boolean;
    mustChangePassword: boolean;
  }): {
    username: string;
    displayName: string;
    role: 'ADMIN' | 'STAFF';
    isActive: boolean;
    mustChangePassword: boolean;
  } {
    return {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
