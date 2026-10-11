"use client";

import type { ViolationCategorySummary } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import {
  violationCategoryNameSchema,
  type ViolationCategoryNameFormInput,
  type ViolationCategoryNameFormValues,
} from "@/lib/forms/schemas";
import { invalidateViolationCategoryQueries } from "@/lib/query/keys";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "CATEGORY_NAME_TAKEN") {
    return "มีหมวดชื่อนี้อยู่แล้ว";
  }
  return error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
}

export function CategoryNameModal({
  onClose,
  onSaved,
  open,
  target,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
  open: boolean;
  target: ViolationCategorySummary | null;
}) {
  const queryClient = useQueryClient();
  const form = useForm<
    ViolationCategoryNameFormInput,
    unknown,
    ViolationCategoryNameFormValues
  >({
    defaultValues: { name: "" },
    resolver: zodResolver(violationCategoryNameSchema),
  });
  const mutation = useMutation({
    mutationFn: (values: ViolationCategoryNameFormValues) =>
      target
        ? parkingApi.renameViolationCategory(target.id, values)
        : parkingApi.createViolationCategory(values),
    onSuccess: async () => {
      await invalidateViolationCategoryQueries(queryClient, {
        renamed: target !== null,
      });
      onSaved(target ? "เปลี่ยนชื่อหมวดแล้ว" : "เพิ่มหมวดแล้ว");
      onClose();
    },
  });
  const { reset } = form;
  const resetMutation = mutation.reset;

  useEffect(() => {
    if (open) {
      reset({ name: target?.name ?? "" });
      resetMutation();
    }
  }, [open, reset, resetMutation, target]);

  function close() {
    if (mutation.isPending) return;
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
            form="category-name-form"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </>
      }
      initialFocus='input[name="name"]'
      onClose={close}
      open={open}
      pending={mutation.isPending}
      title={target ? `เปลี่ยนชื่อ ${target.name}` : "เพิ่มหมวด"}
    >
      <form
        className="form-stack"
        id="category-name-form"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <label className="form-field">
          <span>ชื่อหมวด</span>
          <input maxLength={101} {...form.register("name")} />
          {form.formState.errors.name ? (
            <small className="field-error">
              {form.formState.errors.name.message}
            </small>
          ) : null}
        </label>
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {errorMessage(mutation.error)}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
