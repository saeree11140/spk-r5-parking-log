"use client";

import type { ViolationResponse } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { DateTimePickerField } from "@/components/ui/date-time-picker";
import { Modal } from "@/components/ui/modal";
import { formatBaht } from "@/features/dashboard/dashboard-summary";
import { parkingApi } from "@/lib/api/parking-api";
import {
  localDateTimeToIso,
  toDateTimeLocalCeilingValue,
  toDateTimeLocalValue,
} from "@/lib/date-time";
import {
  markFinePaidSchema,
  type MarkFinePaidFormInput,
  type MarkFinePaidFormValues,
} from "@/lib/forms/schemas";
import { invalidateParkingQueries } from "@/lib/query/keys";

interface MarkFinePaidModalProps {
  houseCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  open: boolean;
  violation: ViolationResponse;
}

export function MarkFinePaidModal({
  houseCode,
  onClose,
  onSuccess,
  open,
  violation,
}: MarkFinePaidModalProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const maximumPaidAt = toDateTimeLocalValue(now);
  const minimumPaidAt = toDateTimeLocalCeilingValue(violation.occurredAt);
  const schema = markFinePaidSchema(violation.occurredAt, now);
  const form = useForm<MarkFinePaidFormInput, unknown, MarkFinePaidFormValues>({
    defaultValues: {
      paidAt: maximumPaidAt,
      reference: undefined,
    },
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: (values: MarkFinePaidFormValues) =>
      parkingApi.markFinePaid(houseCode, violation.id, {
        paidAt: localDateTimeToIso(values.paidAt),
        ...(values.reference ? { reference: values.reference } : {}),
      }),
    onSuccess: async () => {
      await invalidateParkingQueries(queryClient, houseCode);
      form.reset();
      onSuccess("บันทึกการชำระแล้ว");
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
            กลับ
          </Button>
          <Button
            disabled={mutation.isPending}
            form="mark-fine-paid-form"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "กำลังบันทึก..." : "ยืนยันว่าชำระแล้ว"}
          </Button>
        </>
      }
      initialFocus='input[name="paidAt"]'
      onClose={close}
      open={open}
      pending={mutation.isPending}
      title={`บันทึกชำระ Fine ครั้งที่ ${violation.sequenceNumber}`}
    >
      <form
        className="form-stack"
        id="mark-fine-paid-form"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="fine-summary">
          <span>ยอด Fine</span>
          <strong>{formatBaht(violation.fine?.amountBaht ?? 0)}</strong>
        </div>
        <p className="confirmation-copy">
          เมื่อบันทึกว่าชำระแล้ว จะย้อนกลับไม่ได้ในระบบนี้
        </p>
        <Controller
          control={form.control}
          name="paidAt"
          render={({ field, fieldState }) => (
            <DateTimePickerField
              ref={field.ref}
              disabled={mutation.isPending}
              error={fieldState.error?.message}
              label="วันเวลาชำระ"
              maxValue={maximumPaidAt}
              minValue={minimumPaidAt}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <label className="form-field">
          <span>เลขอ้างอิง</span>
          <input
            maxLength={129}
            placeholder="เช่น เลขที่ใบเสร็จ (ถ้ามี)"
            type="text"
            {...form.register("reference")}
          />
          {form.formState.errors.reference ? (
            <small className="field-error">
              {form.formState.errors.reference.message}
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
