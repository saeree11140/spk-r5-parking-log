import type {
  UserResponse,
  UsersResponse,
} from '@spk-r5-parking-log/shared-types';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Roles('ADMIN')
@SkipThrottle({ auth: true })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(): Promise<UsersResponse> {
    return this.usersService.list();
  }

  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.create(actor, input);
  }

  @Patch(':userId')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.update(actor, userId, input);
  }

  @Post(':userId/reset-password')
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: ResetPasswordDto,
  ): Promise<UserResponse> {
    return this.usersService.resetPassword(actor, userId, input);
  }
}
