"use client";

import type { UserSummary } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usersApi } from "@/lib/api/users-api";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/forms/user-schemas";
import { userKeys } from "@/lib/query/keys";

export function ResetPasswordModal({
  onClose,
  open,
  target,
}: {
  onClose: () => void;
  open: boolean;
  target: UserSummary | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { temporaryPassword: "" },
    resolver: zodResolver(resetPasswordSchema),
  });
  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      usersApi.resetPassword(target?.id ?? "", values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      form.reset();
      onClose();
    },
  });

  return (
    <Modal
      footer={
        <>
          <Button disabled={mutation.isPending} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            disabled={mutation.isPending}
            form="reset-password-form"
            type="submit"
            variant="primary"
          >
            ตั้งรหัสผ่านชั่วคราว
          </Button>
        </>
      }
      initialFocus='input[name="temporaryPassword"]'
      onClose={onClose}
      open={open}
      pending={mutation.isPending}
      title={`Reset Password — ${target?.username ?? ""}`}
    >
      <form
        className="form-stack"
        id="reset-password-form"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <p className="confirmation-copy">
          ผู้ใช้นี้ต้องเปลี่ยนรหัสผ่านอีกครั้งเมื่อเข้าสู่ระบบ
        </p>
        <label className="form-field">
          <span>รหัสผ่านชั่วคราว</span>
          <input
            autoComplete="new-password"
            type="password"
            {...form.register("temporaryPassword")}
          />
          {form.formState.errors.temporaryPassword ? (
            <small className="field-error">
              {form.formState.errors.temporaryPassword.message}
            </small>
          ) : null}
        </label>
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Reset Password ไม่สำเร็จ"}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
