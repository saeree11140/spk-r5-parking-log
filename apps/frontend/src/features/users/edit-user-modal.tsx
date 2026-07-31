"use client";

import type { UserSummary } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usersApi } from "@/lib/api/users-api";
import {
  editUserSchema,
  type EditUserFormValues,
} from "@/lib/forms/user-schemas";
import { userKeys } from "@/lib/query/keys";

export function EditUserModal({
  onClose,
  open,
  target,
}: {
  onClose: () => void;
  open: boolean;
  target: UserSummary | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<EditUserFormValues>({
    defaultValues: { displayName: "", role: "STAFF" },
    resolver: zodResolver(editUserSchema),
  });
  useEffect(() => {
    if (target) {
      form.reset({ displayName: target.displayName, role: target.role });
    }
  }, [form, target]);
  const mutation = useMutation({
    mutationFn: (values: EditUserFormValues) =>
      usersApi.update(target?.id ?? "", values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
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
            form="edit-user-form"
            type="submit"
            variant="primary"
          >
            บันทึก
          </Button>
        </>
      }
      initialFocus='input[name="displayName"]'
      onClose={onClose}
      open={open}
      pending={mutation.isPending}
      title={`แก้ไข ${target?.username ?? "ผู้ใช้"}`}
    >
      <form
        className="form-stack"
        id="edit-user-form"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label className="form-field">
          <span>ชื่อที่แสดง</span>
          <input {...form.register("displayName")} />
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
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "บันทึกไม่สำเร็จ"}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
