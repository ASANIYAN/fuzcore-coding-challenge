import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatAmountInput,
  normalizeAmountInput,
} from "@/lib/amount-input";

interface CustomAmountInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  description?: string;
  error?: string;
}

export default function CustomAmountInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  containerClassName,
  labelClassName,
  inputClassName,
  errorClassName,
  description,
  error,
}: CustomAmountInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error: fieldError } }) => {
        const hasError = !!error || !!fieldError;
        const validationMessages = fieldError?.types
          ? Object.values(fieldError.types).flatMap((message) =>
              typeof message === "string" ? [{ message }] : [],
            )
          : [];

        return (
          <Field data-invalid={hasError} className={cn(containerClassName)}>
            {label ? (
              <FieldLabel
                htmlFor={name}
                className={cn("text-xiii text-app-text", labelClassName)}
              >
                {label}
              </FieldLabel>
            ) : null}

            <div
              className={cn(
                "flex items-center rounded-[--radius-lg] border border-app-border bg-app-card px-4 py-3 transition-colors focus-within:border-app-primary",
                hasError && "border-app-danger",
              )}
            >
              <Input
                ref={field.ref}
                id={name}
                type="text"
                value={formatAmountInput(field.value as string | number | null)}
                onChange={(event) => {
                  field.onChange(normalizeAmountInput(event.target.value));
                }}
                onBlur={field.onBlur}
                placeholder={placeholder}
                disabled={disabled}
                inputMode="decimal"
                autoComplete="off"
                aria-invalid={hasError}
                className={cn(
                  "h-auto border-0 bg-transparent p-0 text-xiv text-app-text placeholder:text-app-text-subtle shadow-none focus-visible:ring-0",
                  inputClassName,
                )}
              />
            </div>

            {description ? (
              <FieldDescription className="text-xii text-app-text-muted">
                {description}
              </FieldDescription>
            ) : null}

            {hasError ? (
              <FieldError
                errors={
                  validationMessages.length > 0
                    ? validationMessages
                    : [fieldError || { message: error }]
                }
                className={cn("text-xii text-app-danger", errorClassName)}
              />
            ) : null}
          </Field>
        );
      }}
    />
  );
}
