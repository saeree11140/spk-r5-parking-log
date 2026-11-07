import { Transform } from 'class-transformer';
import { IsString, MinLength, ValidateBy } from 'class-validator';

import { MaxCodePoints } from '../common/max-code-points';
import { normalizeCategoryName } from './category-name';

// Width of violation_categories.normalized_name.
const MAX_NORMALIZED_LENGTH = 400;

export class ViolationCategoryNameDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxCodePoints(100)
  @ValidateBy({
    name: 'normalizedNameFits',
    validator: {
      // NFKC can expand one character into many (U+FDFA becomes 18).
      validate: (value: unknown) =>
        typeof value === 'string' &&
        [...normalizeCategoryName(value)].length <= MAX_NORMALIZED_LENGTH,
      defaultMessage: () => '$property is too long once normalized',
    },
  })
  name!: string;
}
