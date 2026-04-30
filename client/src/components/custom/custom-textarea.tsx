import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

interface CustomTextareaProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  errorClassName?: string;
  description?: string;
  error?: string;
  rows?: number;
}

export function CustomTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  containerClassName,
  labelClassName,
  textareaClassName,
  errorClassName,
  description,
  error,
  rows,
}: CustomTextareaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error: fieldError },
      }) => {
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

            <Textarea
              ref={ref}
              id={name}
              value={value ?? ""}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              aria-invalid={hasError}
              className={cn(
                "min-h-0 rounded-[--radius-lg] border border-app-border bg-app-card px-4 py-3 text-xiv text-app-text placeholder:text-app-text-subtle focus-visible:border-app-primary focus-visible:ring-0",
                hasError && "border-app-danger",
                textareaClassName,
              )}
            />

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

export default CustomTextarea;
