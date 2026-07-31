"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usersApi } from "@/lib/api/users-api";
import {
  createUserSchema,
  type CreateUserFormInput,
  type CreateUserFormValues,
} from "@/lib/forms/user-schemas";
import { userKeys } from "@/lib/query/keys";

export function CreateUserModal({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateUserFormInput, unknown, CreateUserFormValues>({
    defaultValues: {
      displayName: "",
      role: "STAFF",
      temporaryPassword: "",
      username: "",
    },
    resolver: zodResolver(createUserSchema),
  });
  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      form.reset();
      onClose();
    },
  });

  function close() {
    if (mutation.isPending) return;
    mutation.reset();
    form.reset();
    onClose();
  }

  return (
    <Modal
      footer={
        <>
          <Button disabled={mutation.isPending} onClick={close}>
            ยกเลิก
          </Button>
          <Button
            disabled={mutation.isPending}
            form="create-user-form"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
          </Button>
        </>
      }
      initialFocus='input[name="username"]'
      onClose={close}
      open={open}
      pending={mutation.isPending}
      title="สร้างผู้ใช้"
    >
      <form
        className="form-stack"
        id="create-user-form"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label className="form-field">
          <span>ชื่อผู้ใช้</span>
          <input autoComplete="off" {...form.register("username")} />
          {form.formState.errors.username ? (
            <small className="field-error">
              {form.formState.errors.username.message}
            </small>
          ) : null}
        </label>
        <label className="form-field">
          <span>ชื่อที่แสดง</span>
          <input autoComplete="name" {...form.register("displayName")} />
          {form.formState.errors.displayName ? (
            <small className="field-error">
              {form.formState.errors.displayName.message}
            </small>
          ) : null}
        </label>
        <label className="select-field">
          <span>สิทธิ์</span>
          <select {...form.register("role")}>
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
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
              : "สร้างผู้ใช้ไม่สำเร็จ"}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
