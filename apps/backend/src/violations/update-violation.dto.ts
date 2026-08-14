import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPastDateTime', async: false })
class IsPastDateTimeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'occurredAt must not be in the future';
  }
}

export class UpdateViolationDto {
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  @Validate(IsPastDateTimeConstraint)
  occurredAt!: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  })
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}
