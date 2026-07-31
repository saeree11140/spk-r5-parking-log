import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('requires uppercase, lowercase, number and 12-128 characters', () => {
    expect(service.validate('short')).toEqual({
      valid: false,
      message:
        'รหัสผ่านต้องยาว 12–128 ตัว และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข',
    });
    expect(service.validate('StrongPassword123')).toEqual({ valid: true });
  });

  it('rejects passwords over 128 characters', () => {
    expect(service.validate(`Aa1${'x'.repeat(126)}`)).toMatchObject({
      valid: false,
    });
  });

  it('hashes with argon2id and verifies without exposing plaintext', async () => {
    const hash = await service.hash('StrongPassword123');

    expect(hash).toContain('$argon2id$');
    expect(hash).not.toContain('StrongPassword123');
    await expect(service.verify(hash, 'StrongPassword123')).resolves.toBe(true);
    await expect(service.verify(hash, 'WrongPassword123')).resolves.toBe(false);
  });
});
