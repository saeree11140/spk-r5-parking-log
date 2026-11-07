import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

const longDisplayName = '❤️'.repeat(128);

describe('displayName length', () => {
  it('rejects a create whose display name exceeds the column', async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: 'staff.one',
      displayName: longDisplayName,
      role: 'STAFF',
      temporaryPassword: 'Temporary123',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(['displayName']);
  });

  it('rejects an update whose display name exceeds the column', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      displayName: longDisplayName,
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(['displayName']);
  });
});
