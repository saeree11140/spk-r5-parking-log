"use client";

import type { CreateViolationInput } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DateTimePickerField } from "@/components/ui/date-time-picker";
import { Modal } from "@/components/ui/modal";
import { parkingApi } from "@/lib/api/parking-api";
import { localDateTimeToIso, toDateTimeLocalValue } from "@/lib/date-time";
import {
  createViolationSchema,
  type CreateViolationFormInput,
  type CreateViolationFormValues,
} from "@/lib/forms/schemas";
import { invalidateParkingQueries } from "@/lib/query/keys";

interface CreateViolationModalProps {
  houseCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  open: boolean;
}

export function CreateViolationModal({
  houseCode,
  onClose,
  onSuccess,
  open,
}: CreateViolationModalProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const maximumOccurredAt = toDateTimeLocalValue(now);
  const schema = createViolationSchema(now);
  const form = useForm<
    CreateViolationFormInput,
    unknown,
    CreateViolationFormValues
  >({
    defaultValues: {
      note: undefined,
      occurredAt: maximumOccurredAt,
    },
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: (input: CreateViolationInput) =>
      parkingApi.createViolation(houseCode, input),
    onSuccess: async () => {
      await invalidateParkingQueries(queryClient, houseCode);
      form.reset();
      onSuccess("บันทึก Violation แล้ว");
      onClose();
    },
  });

  function close() {
    if (mutation.isPending) return;
    mutation.reset();
    form.reset();
    onClose();
  }

  const submitValues = form.handleSubmit((values) => {
    mutation.mutate({
      occurredAt: localDateTimeToIso(values.occurredAt),
      ...(values.note ? { note: values.note } : {}),
    });
  });

  return (
    <Modal
      footer={
        <>
          <Button disabled={mutation.isPending} onClick={close}>
            ยกเลิก
          </Button>
          <Button
            disabled={mutation.isPending}
            form="create-violation-form"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "กำลังบันทึก..." : "บันทึก Violation"}
          </Button>
        </>
      }
      initialFocus='input[name="occurredAt"]'
      onClose={close}
      open={open}
      pending={mutation.isPending}
      title="เพิ่ม Violation"
    >
      <form
        className="form-stack"
        id="create-violation-form"
        onSubmit={submitValues}
      >
        <Controller
          control={form.control}
          name="occurredAt"
          render={({ field, fieldState }) => (
            <DateTimePickerField
              ref={field.ref}
              disabled={mutation.isPending}
              error={fieldState.error?.message}
              label="วันเวลาเกิดเหตุ"
              maxValue={maximumOccurredAt}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <label className="form-field">
          <span>หมายเหตุ</span>
          <textarea
            maxLength={1_001}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            rows={4}
            {...form.register("note")}
          />
          {form.formState.errors.note ? (
            <small className="field-error">
              {form.formState.errors.note.message}
            </small>
          ) : null}
        </label>
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "เกิดข้อผิดพลาด กรุณาลองใหม่"}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
