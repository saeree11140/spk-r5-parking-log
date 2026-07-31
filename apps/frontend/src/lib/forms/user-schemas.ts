import { z } from "zod";

const temporaryPasswordSchema = z
  .string()
  .min(12, "รหัสผ่านต้องมี 12–128 ตัวอักษร")
  .max(128, "รหัสผ่านต้องมี 12–128 ตัวอักษร")
  .regex(/[a-z]/, "รหัสผ่านต้องมีตัวพิมพ์เล็ก")
  .regex(/[A-Z]/, "รหัสผ่านต้องมีตัวพิมพ์ใหญ่")
  .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลข");

const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "กรุณาระบุชื่อที่แสดง").max(255));

export const createUserSchema = z.object({
  username: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .regex(
          /^[a-z0-9._-]{3,64}$/,
          "ใช้ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง 3–64 ตัว",
        ),
    ),
  displayName: displayNameSchema,
  role: z.enum(["ADMIN", "STAFF"]),
  temporaryPassword: temporaryPasswordSchema,
});

export const editUserSchema = z.object({
  displayName: displayNameSchema,
  role: z.enum(["ADMIN", "STAFF"]),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: temporaryPasswordSchema,
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type CreateUserFormInput = z.input<typeof createUserSchema>;
export type EditUserFormValues = z.infer<typeof editUserSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
