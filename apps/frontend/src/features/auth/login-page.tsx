"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/api-error";
import { authApi } from "@/lib/api/auth-api";
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormValues,
} from "@/lib/forms/auth-schemas";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

export function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const form = useForm<LoginFormInput, unknown, LoginFormValues>({
    defaultValues: { password: "", username: "" },
    resolver: zodResolver(loginSchema),
  });
  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth, user);
      setAuthenticated(user);
      router.replace(user.mustChangePassword ? "/change-password" : "/");
    },
  });

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-labelledby="login-heading">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>SPK R5</strong>
            <small>Parking Log</small>
          </span>
        </div>
        <div className="permit-mark" aria-hidden="true">
          R5
          <span>AUTHORIZED AREA</span>
        </div>
        <div>
          <p className="eyebrow">ระบบงานนิติบุคคล</p>
          <h1 id="login-heading">บันทึกชัด ติดตามค่าปรับได้ทุกหลัง</h1>
          <p>
            พื้นที่สำหรับเจ้าหน้าที่หมู่บ้าน SPK R5 เพื่อดูประวัติ Violation
            และสถานะค่าปรับ
          </p>
        </div>
      </section>

      <section className="auth-panel" aria-label="เข้าสู่ระบบ">
        <div className="auth-card">
          <ShieldCheck aria-hidden="true" className="auth-card-icon" />
          <p className="eyebrow">STAFF ACCESS</p>
          <h2>เข้าสู่ระบบ</h2>
          <p className="auth-card-copy">ใช้บัญชีที่ผู้ดูแลระบบสร้างให้</p>

          <form
            className="form-stack auth-form"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <label className="form-field">
              <span>ชื่อผู้ใช้</span>
              <input
                autoComplete="username"
                autoFocus
                {...form.register("username")}
              />
              {form.formState.errors.username ? (
                <small className="field-error">
                  {form.formState.errors.username.message}
                </small>
              ) : null}
            </label>
            <label className="form-field">
              <span>รหัสผ่าน</span>
              <input
                autoComplete="current-password"
                type="password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <small className="field-error">
                  {form.formState.errors.password.message}
                </small>
              ) : null}
            </label>
            {mutation.isError ? (
              <p className="form-error" role="alert">
                {mutation.error instanceof ApiError &&
                mutation.error.code === "AUTH_INVALID_CREDENTIALS"
                  ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
                  : mutation.error instanceof Error
                    ? mutation.error.message
                    : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"}
              </p>
            ) : null}
            <Button
              disabled={mutation.isPending}
              icon={KeyRound}
              type="submit"
              variant="primary"
            >
              {mutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
