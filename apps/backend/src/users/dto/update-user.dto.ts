import type { UserRole } from '@spk-r5-parking-log/shared-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { MaxCodePoints } from '../../common/max-code-points';

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxCodePoints(255)
  displayName?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'STAFF'])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
