import type {
  AuthResponse,
  LogoutResponse,
} from '@spk-r5-parking-log/shared-types';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthCookieService, REFRESH_COOKIE_NAME } from './auth-cookie.service';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
import { AllowPasswordChange } from './decorators/allow-password-change.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@SkipThrottle({ auth: true })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Public()
  @SkipThrottle({ auth: false })
  @Throttle({
    auth: { limit: 10, ttl: 60_000, blockDuration: 60_000 },
  })
  @Post('login')
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.login(
      input,
      this.requestMetadata(request),
    );
    this.cookieService.setAuthCookies(response, tokens);

    return { user: tokens.user };
  }

  @Public()
  @SkipThrottle({ auth: false })
  @Throttle({
    auth: { limit: 10, ttl: 60_000, blockDuration: 60_000 },
  })
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = this.cookie(request, REFRESH_COOKIE_NAME);
    try {
      const tokens = await this.authService.refresh(
        refreshToken,
        this.requestMetadata(request),
      );
      this.cookieService.setAuthCookies(response, tokens);

      return { user: tokens.user };
    } catch (error: unknown) {
      this.cookieService.clearAuthCookies(response);
      throw error;
    }
  }

  @AllowPasswordChange()
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponse> {
    await this.authService.logout(user);
    this.cookieService.clearAuthCookies(response);

    return { success: true };
  }

  @AllowPasswordChange()
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthResponse {
    return { user: this.authService.me(user) };
  }

  @AllowPasswordChange()
  @Post('change-password')
  async changePassword(
    @Body() input: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.changePassword(user, input);
    this.cookieService.setAuthCookies(response, tokens);

    return { user: tokens.user };
  }

  private requestMetadata(request: Request): RequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  private cookie(request: Request, name: string): string {
    const cookies = request.cookies as Record<string, unknown>;
    const value = cookies[name];

    return typeof value === 'string' ? value : '';
  }
}
