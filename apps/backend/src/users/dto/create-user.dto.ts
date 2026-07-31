import type { UserRole } from '@spk-r5-parking-log/shared-types';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Matches(/^[a-z0-9._-]{3,64}$/)
  username!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName!: string;

  @IsIn(['ADMIN', 'STAFF'])
  role!: UserRole;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  temporaryPassword!: string;
}
