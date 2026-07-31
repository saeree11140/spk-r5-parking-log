import type {
  AuthResponse,
  LogoutResponse,
} from '@spk-r5-parking-log/shared-types';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthCookieService, REFRESH_COOKIE_NAME } from './auth-cookie.service';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, RequestMetadata } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: AuthCookieService,
  ) {}

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

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = this.cookie(request, REFRESH_COOKIE_NAME);
    const tokens = await this.authService.refresh(
      refreshToken,
      this.requestMetadata(request),
    );
    this.cookieService.setAuthCookies(response, tokens);

    return { user: tokens.user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponse> {
    await this.authService.logout(this.currentUser(request));
    this.cookieService.clearAuthCookies(response);

    return { success: true };
  }

  @Get('me')
  me(@Req() request: Request): AuthResponse {
    return { user: this.authService.me(this.currentUser(request)) };
  }

  @Post('change-password')
  async changePassword(
    @Body() input: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const tokens = await this.authService.changePassword(
      this.currentUser(request),
      input,
    );
    this.cookieService.setAuthCookies(response, tokens);

    return { user: tokens.user };
  }

  private requestMetadata(request: Request): RequestMetadata {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  private currentUser(request: Request): AuthenticatedUser {
    return (request as Request & { user: AuthenticatedUser }).user;
  }

  private cookie(request: Request, name: string): string {
    const cookies = request.cookies as Record<string, unknown>;
    const value = cookies[name];

    return typeof value === 'string' ? value : '';
  }
}
