import type { InputHTMLAttributes, ReactNode } from "react";
import "./FormField.css";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({
  id,
  label,
  error,
  children,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>

      {children ?? (
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
      )}

      {error && (
        <span className="form-field__error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
