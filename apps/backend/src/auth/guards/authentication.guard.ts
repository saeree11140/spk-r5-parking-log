import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { DomainError } from '../../common/domain-error';
import { PrismaService } from '../../database/prisma.service';
import { ACCESS_COOKIE_NAME } from '../auth-cookie.service';
import type { AuthenticatedUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.cookie(request, ACCESS_COOKIE_NAME);
    if (!accessToken) throw this.authenticationRequired();

    try {
      const claims = await this.tokenService.verifyAccessToken(accessToken);
      const session = await this.prisma.authSession.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { isActive: true },
        },
        include: { user: true },
      });
      if (!session) throw this.authenticationRequired();

      const user: AuthenticatedUser = {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        role: session.user.role,
        isActive: session.user.isActive,
        mustChangePassword: session.user.mustChangePassword,
        sessionId: session.id,
        sessionExpiresAt: session.expiresAt,
      };
      (request as Request & { user: AuthenticatedUser }).user = user;

      return true;
    } catch {
      throw this.authenticationRequired();
    }
  }

  private cookie(request: Request, name: string): string | null {
    const cookies = request.cookies as Record<string, unknown>;
    const value = cookies[name];

    return typeof value === 'string' ? value : null;
  }

  private authenticationRequired(): DomainError {
    return new DomainError(401, 'AUTH_REQUIRED', 'Authentication required');
  }
}
