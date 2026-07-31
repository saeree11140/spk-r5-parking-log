import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const PASSWORD_POLICY_MESSAGE =
  'รหัสผ่านต้องยาว 12–128 ตัว และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข';

export type PasswordValidation =
  | { valid: true }
  | {
      valid: false;
      message: string;
    };

@Injectable()
export class PasswordService {
  validate(password: string): PasswordValidation {
    const valid =
      password.length >= 12 &&
      password.length <= 128 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password);

    return valid
      ? { valid: true }
      : { valid: false, message: PASSWORD_POLICY_MESSAGE };
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
