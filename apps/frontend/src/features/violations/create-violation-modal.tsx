import type { CreateViolationInput } from "@spk-r5-parking-log/shared-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ApiError } from "@/lib/api/api-error";
import { parkingApi } from "@/lib/api/parking-api";
import { localDateTimeToIso, toDateTimeLocalValue } from "@/lib/date-time";
import {
  createViolationSchema,
  type CreateViolationFormInput,
  type CreateViolationFormValues,
} from "@/lib/forms/schemas";
import { invalidateParkingQueries, queryKeys } from "@/lib/query/keys";
import { useViolationCategoriesQuery } from "@/lib/query/use-violation-categories";

import { ViolationFormFields } from "./violation-form-fields";

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
  const categoriesQuery = useViolationCategoriesQuery({ enabled: open });
  const activeCategories = categoriesQuery.data?.filter(
    ({ isActive }) => isActive,
  );
  const form = useForm<
    CreateViolationFormInput,
    unknown,
    CreateViolationFormValues
  >({
    defaultValues: {
      categoryId: "",
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
    onError: async (error) => {
      if (error instanceof ApiError && error.code === "CATEGORY_INACTIVE") {
        form.setValue("categoryId", "");
        await queryClient.invalidateQueries({
          queryKey: queryKeys.violationCategories,
        });
      }
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
      categoryId: values.categoryId,
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
        <ViolationFormFields
          form={form}
          pending={mutation.isPending}
          maximumOccurredAt={maximumOccurredAt}
          category={{ kind: "select", options: activeCategories }}
        />
        {categoriesQuery.isError ? (
          <div className="form-error" role="alert">
            <span>โหลดหมวดไม่สำเร็จ</span>
            <Button
              disabled={categoriesQuery.isFetching}
              onClick={() => void categoriesQuery.refetch()}
              variant="ghost"
            >
              ลองใหม่
            </Button>
          </div>
        ) : null}
        {mutation.isError ? (
          <p className="form-error" role="alert">
            {mutation.error instanceof ApiError &&
            mutation.error.code === "CATEGORY_INACTIVE"
              ? "หมวดนี้ถูกปิดใช้งานแล้ว กรุณาเลือกหมวดอื่น"
              : mutation.error instanceof Error
                ? mutation.error.message
                : "เกิดข้อผิดพลาด กรุณาลองใหม่"}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
