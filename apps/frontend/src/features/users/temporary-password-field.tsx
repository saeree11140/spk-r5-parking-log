import type { UseFormRegisterReturn } from "react-hook-form";

interface TemporaryPasswordFieldProps {
  registration: UseFormRegisterReturn<"temporaryPassword">;
  error?: string;
}

export function TemporaryPasswordField({
  registration,
  error,
}: TemporaryPasswordFieldProps) {
  return (
    <label className="form-field">
      <span>รหัสผ่านชั่วคราว</span>
      <input autoComplete="new-password" type="password" {...registration} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
