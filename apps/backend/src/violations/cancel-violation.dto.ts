import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

import { MaxCodePoints } from '../common/max-code-points';

export class CancelViolationDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString()
  @MinLength(5)
  @MaxCodePoints(500)
  reason!: string;
}
