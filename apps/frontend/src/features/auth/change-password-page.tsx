"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth-api";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/forms/auth-schemas";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

export function ChangePasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const form = useForm<ChangePasswordFormValues>({
    defaultValues: {
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    },
    resolver: zodResolver(changePasswordSchema),
  });
  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth, user);
      setAuthenticated(user);
      router.replace("/");
    },
  });

  return (
    <main className="password-page">
      <section className="password-card">
        <span className="password-icon">
          <LockKeyhole aria-hidden="true" />
        </span>
        <p className="eyebrow">SECURITY REQUIRED</p>
        <h1>ตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน</h1>
        <p>
          รหัสผ่านต้องยาว 12–128 ตัวอักษร และมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก
          และตัวเลข
        </p>
        <form
          className="form-stack auth-form"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <label className="form-field">
            <span>รหัสผ่านปัจจุบัน</span>
            <input
              autoComplete="current-password"
              autoFocus
              type="password"
              {...form.register("currentPassword")}
            />
            {form.formState.errors.currentPassword ? (
              <small className="field-error">
                {form.formState.errors.currentPassword.message}
              </small>
            ) : null}
          </label>
          <label className="form-field">
            <span>รหัสผ่านใหม่</span>
            <input
              autoComplete="new-password"
              type="password"
              {...form.register("newPassword")}
            />
            {form.formState.errors.newPassword ? (
              <small className="field-error">
                {form.formState.errors.newPassword.message}
              </small>
            ) : null}
          </label>
          <label className="form-field">
            <span>ยืนยันรหัสผ่านใหม่</span>
            <input
              autoComplete="new-password"
              type="password"
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword ? (
              <small className="field-error">
                {form.formState.errors.confirmPassword.message}
              </small>
            ) : null}
          </label>
          {mutation.isError ? (
            <p className="form-error" role="alert">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "เปลี่ยนรหัสผ่านไม่สำเร็จ"}
            </p>
          ) : null}
          <Button disabled={mutation.isPending} type="submit" variant="primary">
            {mutation.isPending ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
          </Button>
        </form>
      </section>
    </main>
  );
}
