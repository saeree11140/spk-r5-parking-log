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
}

export function ViolationFormFields({
  form,
  pending,
  maximumOccurredAt,
}: ViolationFormFieldsProps) {
  return (
    <>
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
