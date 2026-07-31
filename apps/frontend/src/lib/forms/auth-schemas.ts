import { z } from "zod";

const passwordPolicy = z
  .string()
  .min(12, "รหัสผ่านต้องมี 12–128 ตัวอักษร")
  .max(128, "รหัสผ่านต้องมี 12–128 ตัวอักษร")
  .regex(/[a-z]/, "รหัสผ่านต้องมีตัวพิมพ์เล็ก")
  .regex(/[A-Z]/, "รหัสผ่านต้องมีตัวพิมพ์ใหญ่")
  .regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลข");

export const loginSchema = z.object({
  username: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.string().min(1, "กรุณาระบุชื่อผู้ใช้").max(64)),
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณาระบุรหัสผ่านปัจจุบัน").max(128),
    newPassword: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "รหัสผ่านใหม่ไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type LoginFormInput = z.input<typeof loginSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
