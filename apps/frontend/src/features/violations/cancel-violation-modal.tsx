"use client";

import type { ViolationResponse } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import {
  cancelViolationSchema,
  type CancelViolationFormValues,
} from "@/lib/forms/schemas";
import { invalidateParkingQueries } from "@/lib/query/keys";

interface CancelViolationModalProps {
  houseCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  open: boolean;
  violation: ViolationResponse;
}

export function CancelViolationModal({
  houseCode,
  onClose,
  onSuccess,
  open,
  violation,
}: CancelViolationModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<CancelViolationFormValues>({
    defaultValues: { reason: "" },
    resolver: zodResolver(cancelViolationSchema),
  });
  const mutation = useMutation({
    mutationFn: (input: CancelViolationFormValues) =>
      parkingApi.cancelViolation(houseCode, violation.id, input),
    onSuccess: async () => {
      await invalidateParkingQueries(queryClient, houseCode);
      form.reset();
      onSuccess("ยกเลิก Violation แล้ว");
      onClose();
    },
  });

  function close() {
    if (mutation.isPending) return;
    mutation.reset();
    form.reset();
    onClose();
  }

  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const errorMessage =
    mutation.error instanceof ApiError &&
    mutation.error.code === "CONCURRENT_MODIFICATION"
      ? "ข้อมูลมีการเปลี่ยนแปลง กรุณาลองใหม่"
      : mutation.error instanceof Error
        ? mutation.error.message
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";

  return (
    <Modal
      footer={
        <>
          <Button disabled={mutation.isPending} onClick={close}>
            กลับ
          </Button>
          <Button
            disabled={mutation.isPending}
            form="cancel-violation-form"
            type="submit"
            variant="danger"
          >
            {mutation.isPending ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
          </Button>
        </>
      }
      initialFocus='textarea[name="reason"]'
      onClose={close}
      open={open}
      pending={mutation.isPending}
      title={`ยกเลิก Violation ครั้งที่ ${violation.sequenceNumber}`}
    >
      <form className="form-stack" id="cancel-violation-form" onSubmit={submit}>
        <p className="confirmation-copy">
          ระบบจะเก็บประวัติการยกเลิกและคำนวณลำดับกับค่าปรับใหม่
        </p>
        <label className="form-field">
          <span>เหตุผลที่ยกเลิก</span>
          <textarea rows={4} {...form.register("reason")} />
          {form.formState.errors.reason ? (
            <small className="field-error">
              {form.formState.errors.reason.message}
            </small>
          ) : null}
        </label>
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
