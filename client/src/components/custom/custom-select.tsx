import { cn } from "@/lib/utils";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

interface CustomSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  selectTriggerClassName?: string;
  selectContentClassName?: string;
  selectItemClassName?: string;
  errorClassName?: string;
  description?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function CustomSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  containerClassName,
  labelClassName,
  selectTriggerClassName,
  selectContentClassName,
  selectItemClassName,
  errorClassName,
  description,
  options,
  error,
}: CustomSelectProps<T>) {
  const safeOptions = options.filter(
    (option) =>
      typeof option.value === "string" && option.value.trim().length > 0,
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
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

            <Select
              onValueChange={onChange}
              value={(value as string) || ""}
              disabled={disabled}
              onOpenChange={(open) => {
                if (!open) {
                  onBlur();
                }
              }}
            >
              <SelectTrigger
                id={name}
                aria-invalid={hasError}
                className={cn(
                  "h-12 rounded-[--radius-lg] border border-app-border bg-app-card px-4 text-xiv text-app-text shadow-none transition-opacity duration-fast data-[placeholder]:text-app-text-subtle focus-visible:border-app-primary focus-visible:ring-0 hover:opacity-90",
                  hasError && "border-app-danger",
                  selectTriggerClassName,
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent
                className={cn(
                  "border-app-border bg-app-card text-app-text shadow-dropdown",
                  selectContentClassName,
                )}
              >
                {safeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={cn(
                      "text-xiv text-app-text transition-opacity duration-fast focus:bg-app-primary-dim focus:text-app-text hover:opacity-85",
                      selectItemClassName,
                    )}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

export default CustomSelect;
