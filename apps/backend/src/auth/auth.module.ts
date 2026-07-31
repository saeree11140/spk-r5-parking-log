import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';

import { requireAuthEnvironment } from './auth-environment';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_ENVIRONMENT } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_ENVIRONMENT,
      useFactory: requireAuthEnvironment,
    },
    PasswordService,
    TokenService,
    AuthCookieService,
    AuthService,
  ],
  exports: [
    AUTH_ENVIRONMENT,
    PasswordService,
    TokenService,
    AuthCookieService,
    AuthService,
  ],
})
export class AuthModule {}
