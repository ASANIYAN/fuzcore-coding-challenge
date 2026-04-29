import { cn } from "@/lib/utils";
import type React from "react";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface CustomInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  description?: string;
  type?: "text" | "password" | "email" | "number" | "tel" | "time";
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  pattern?: string;
  sanitizeValue?: (value: string) => string;
}

export function CustomInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  leftIcon,
  rightIcon,
  containerClassName,
  labelClassName,
  inputClassName,
  errorClassName,
  description,
  type = "text",
  error,
  inputMode,
  maxLength,
  pattern,
  sanitizeValue,
}: CustomInputProps<T>) {
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
              <FieldLabel htmlFor={name} className={cn("text-xiii text-app-text", labelClassName)}>
                {label}
              </FieldLabel>
            ) : null}

            <div
              className={cn(
                "flex items-center rounded-[--radius-lg] border border-app-border bg-app-card px-4 py-3 transition-colors focus-within:border-app-primary",
                hasError && "border-app-danger",
              )}
            >
              {leftIcon ? <span className="mr-2 text-app-text-muted">{leftIcon}</span> : null}
              <Input
                ref={ref}
                id={name}
                type={type}
                value={value ?? ""}
                onChange={(event) => {
                  const inputValue = event.target.value;
                  onChange(sanitizeValue ? sanitizeValue(inputValue) : inputValue);
                }}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                inputMode={inputMode}
                maxLength={maxLength}
                pattern={pattern}
                aria-invalid={hasError}
                className={cn(
                  "h-auto border-0 bg-transparent p-0 text-xiv text-app-text placeholder:text-app-text-subtle shadow-none focus-visible:ring-0",
                  inputClassName,
                )}
              />
              {rightIcon ? <span className="ml-2 text-app-text-muted">{rightIcon}</span> : null}
            </div>

            {description ? (
              <FieldDescription className="text-xii text-app-text-muted">{description}</FieldDescription>
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

export default CustomInput;
