import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { ViolationCategorySummary } from '@spk-r5-parking-log/shared-types';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { toAuditActor } from '../audit/audit-log';
import { ViolationCategoriesService } from './violation-categories.service';
import { ViolationCategoryNameDto } from './violation-category-name.dto';

@Roles('ADMIN', 'STAFF')
@SkipThrottle({ auth: true })
@Controller('violation-categories')
export class ViolationCategoriesController {
  constructor(private readonly categories: ViolationCategoriesService) {}

  @Get()
  list(): Promise<ViolationCategorySummary[]> {
    return this.categories.list();
  }

  @Post()
  create(
    @Body() dto: ViolationCategoryNameDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationCategorySummary> {
    return this.categories.create(dto.name, toAuditActor(user));
  }

  @Patch(':categoryId')
  rename(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() dto: ViolationCategoryNameDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationCategorySummary> {
    return this.categories.rename(categoryId, dto.name, toAuditActor(user));
  }

  @Post(':categoryId/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationCategorySummary> {
    return this.categories.setActive(categoryId, true, toAuditActor(user));
  }

  @Post(':categoryId/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ViolationCategorySummary> {
    return this.categories.setActive(categoryId, false, toAuditActor(user));
  }
}
