import { ValidateBy, type ValidationOptions } from 'class-validator';

/**
 * Length limit that matches a Postgres VARCHAR(n): one per code point.
 * class-validator's MaxLength skips U+FE0E/U+FE0F, so a value that passes
 * it can still overflow the column and fail the insert with a 500.
 */
export function MaxCodePoints(
  max: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxCodePoints',
      constraints: [max],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && [...value].length <= max,
        defaultMessage: () =>
          `$property must be at most ${max} characters long`,
      },
    },
    options,
  );
}
