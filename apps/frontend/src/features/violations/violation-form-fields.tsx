import type { ViolationCategorySummary } from "@spk-r5-parking-log/shared-types";
import { Controller, type UseFormReturn } from "react-hook-form";

import { DateTimePickerField } from "@/components/ui/date-time-picker";
import type {
  CreateViolationFormInput,
  CreateViolationFormValues,
} from "@/lib/forms/schemas";

interface ViolationFormFieldsProps {
  form: UseFormReturn<
    CreateViolationFormInput,
    unknown,
    CreateViolationFormValues
  >;
  pending: boolean;
  maximumOccurredAt: string;
  category:
    | { kind: "select"; options: ViolationCategorySummary[] | undefined }
    | { kind: "fixed"; value: ViolationCategorySummary };
}

export function ViolationFormFields({
  form,
  pending,
  maximumOccurredAt,
  category,
}: ViolationFormFieldsProps) {
  return (
    <>
      {category.kind === "select" ? (
        <label className="select-field">
          <span>หมวด</span>
          <select
            disabled={pending || category.options === undefined}
            {...form.register("categoryId")}
          >
            <option value="">
              {category.options === undefined
                ? "กำลังโหลดหมวด..."
                : "เลือกหมวด"}
            </option>
            {category.options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {form.formState.errors.categoryId ? (
            <small className="field-error">
              {form.formState.errors.categoryId.message}
            </small>
          ) : null}
        </label>
      ) : (
        <div className="form-field">
          <span>หมวด</span>
          <strong>{category.value.name}</strong>
        </div>
      )}
      <Controller
        control={form.control}
        name="occurredAt"
        render={({ field, fieldState }) => (
          <DateTimePickerField
            ref={field.ref}
            disabled={pending}
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
    </>
  );
}
