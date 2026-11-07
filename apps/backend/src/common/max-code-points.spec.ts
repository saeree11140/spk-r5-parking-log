import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MaxCodePoints } from './max-code-points';

class Sample {
  @MaxCodePoints(4)
  value!: string;
}

async function errorsFor(value: unknown) {
  return validate(plainToInstance(Sample, { value }));
}

describe('MaxCodePoints', () => {
  it('accepts a value at the limit', async () => {
    expect(await errorsFor('abcd')).toHaveLength(0);
  });

  it('counts a surrogate pair as one code point', async () => {
    expect(await errorsFor('😀😀😀😀')).toHaveLength(0);
  });

  it('accepts variation selectors exactly at the limit', async () => {
    expect(await errorsFor('❤️❤️')).toHaveLength(0);
  });

  it('counts variation selectors like Postgres does', async () => {
    expect(await errorsFor('❤️❤️❤')).not.toHaveLength(0);
  });

  it('rejects a non-string', async () => {
    expect(await errorsFor(5)).not.toHaveLength(0);
  });
});
