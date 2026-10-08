import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/format";

/** Form section with a heading (DESIGN_SYSTEM §6). */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-1 text-h3 text-text">{title}</legend>
      {description && <p className="mb-3 text-body-sm text-text-muted">{description}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface FieldWrapProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}

function FieldWrap({ label, htmlFor, required, error, hint, full, children }: FieldWrapProps) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={cx(full && "sm:col-span-2")}>
      <label htmlFor={htmlFor} className="mb-1 block text-body-sm font-medium text-text">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <div data-described-by={describedBy}>{children}</div>
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-caption text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="mt-1 text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "h-9 w-full rounded-sm border bg-surface px-3 text-body-sm text-text placeholder:text-text-muted focus:border-border-strong disabled:bg-surface-muted disabled:text-text-muted";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  full?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, full, id, required, className, ...props },
  ref,
) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrap label={label} htmlFor={fieldId} required={required} error={error} hint={hint} full={full}>
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cx(inputBase, error ? "border-danger" : "border-border", className)}
        {...props}
      />
    </FieldWrap>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  full?: boolean;
  options: { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, full, id, required, options, className, ...props },
  ref,
) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrap label={label} htmlFor={fieldId} required={required} error={error} hint={hint} full={full}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        className={cx(inputBase, "pr-8", error ? "border-danger" : "border-border", className)}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
});

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  full?: boolean;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, error, hint, full, id, required, className, ...props },
  ref,
) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldWrap label={label} htmlFor={fieldId} required={required} error={error} hint={hint} full={full}>
      <textarea
        ref={ref}
        id={fieldId}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        rows={3}
        className={cx(
          "w-full rounded-sm border bg-surface px-3 py-2 text-body-sm text-text placeholder:text-text-muted focus:border-border-strong",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
    </FieldWrap>
  );
});
