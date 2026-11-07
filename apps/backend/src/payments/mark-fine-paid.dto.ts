import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

import { MaxCodePoints } from '../common/max-code-points';

export class MarkFinePaidDto {
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  paidAt!: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString()
  @MaxCodePoints(128)
  reference?: string;
}
