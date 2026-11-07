import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ViolationCategoryNameDto } from './violation-category-name.dto';

describe('ViolationCategoryNameDto', () => {
  it('accepts a 100-character name', async () => {
    const dto = plainToInstance(ViolationCategoryNameDto, {
      name: 'ก'.repeat(100),
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a name whose NFKC form exceeds the normalized column', async () => {
    // U+FDFA expands to 18 characters under NFKC: 100 of them become 1800.
    const dto = plainToInstance(ViolationCategoryNameDto, {
      name: 'ﷺ'.repeat(100),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('counts variation selectors toward the name column', async () => {
    // class-validator's MaxLength ignores U+FE0F; Postgres VARCHAR does not.
    const dto = plainToInstance(ViolationCategoryNameDto, {
      name: '❤️'.repeat(60),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
