import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

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
  @MaxLength(128)
  reference?: string;
}
