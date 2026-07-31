import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

import { DomainError } from '../../common/domain-error';
import type { AuthEnvironment } from '../auth-environment';
import { CSRF_COOKIE_NAME } from '../auth-cookie.service';
import { AUTH_ENVIRONMENT } from '../auth.types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    @Inject(AUTH_ENVIRONMENT)
    private readonly environment: AuthEnvironment,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const origin = this.header(request, 'origin');
    if (origin !== this.environment.frontendUrl) {
      throw this.invalidCsrf();
    }
    if (request.path.endsWith('/auth/login')) return true;

    const cookieToken = this.cookie(request, CSRF_COOKIE_NAME);
    const headerToken = this.header(request, 'x-csrf-token');
    if (!this.matches(cookieToken, headerToken)) {
      throw this.invalidCsrf();
    }

    return true;
  }

  private matches(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length > 0 &&
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private header(request: Request, name: string): string {
    const value = request.headers[name];

    return typeof value === 'string' ? value : '';
  }

  private cookie(request: Request, name: string): string {
    const cookies = request.cookies as Record<string, unknown>;
    const value = cookies[name];

    return typeof value === 'string' ? value : '';
  }

  private invalidCsrf(): DomainError {
    return new DomainError(403, 'CSRF_INVALID', 'CSRF validation failed');
  }
}
