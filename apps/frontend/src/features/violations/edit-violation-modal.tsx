"use client";

import type {
  UpdateViolationInput,
  ViolationResponse,
} from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { parkingApi } from "@/lib/api/parking-api";
import {
  localDateTimeToIso,
  toDateTimeLocalValue,
} from "@/lib/date-time";
import {
  editViolationSchema,
  type EditViolationFormInput,
  type EditViolationFormValues,
} from "@/lib/forms/schemas";
import { invalidateParkingQueries } from "@/lib/query/keys";

interface EditViolationModalProps {
  houseCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  open: boolean;
  violation: ViolationResponse;
}

export function EditViolationModal({
  houseCode,
  onClose,
  onSuccess,
  open,
  violation,
}: EditViolationModalProps) {
  const queryClient = useQueryClient();
  const schema = editViolationSchema(new Date());
  const initialOccurredAt = toDateTimeLocalValue(violation.occurredAt);
  const form = useForm<
    EditViolationFormInput,
    unknown,
    EditViolationFormValues
  >({
    defaultValues: {
      note: violation.note ?? "",
      occurredAt: initialOccurredAt,
    },
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: (input: UpdateViolationInput) =>
      parkingApi.updateViolation(houseCode, violation.id, input),
    onSuccess: async () => {
      await invalidateParkingQueries(queryClient, houseCode);
      form.reset();
      onSuccess("แก้ไข Violation แล้ว");
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
      note: values.note ?? null,
      occurredAt:
        values.occurredAt === initialOccurredAt
          ? violation.occurredAt
          : localDateTimeToIso(values.occurredAt),
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
            form="edit-violation-form"
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
      title="แก้ไข Violation"
    >
      <form
        className="form-stack"
        id="edit-violation-form"
        onSubmit={submitValues}
      >
        <label className="form-field">
          <span>วันเวลาเกิดเหตุ</span>
          <input type="datetime-local" {...form.register("occurredAt")} />
          {form.formState.errors.occurredAt ? (
            <small className="field-error">
              {form.formState.errors.occurredAt.message}
            </small>
          ) : null}
        </label>
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
