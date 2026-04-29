import { cn } from "@/lib/utils";
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

interface CustomDatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  buttonClassName?: string;
  errorClassName?: string;
  description?: string;
  error?: string;
  disableDate?: (date: Date) => boolean;
}

export function CustomDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select date",
  disabled = false,
  containerClassName,
  labelClassName,
  buttonClassName,
  errorClassName,
  description,
  error,
  disableDate,
}: CustomDatePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error: fieldError },
      }) => {
        const hasError = !!error || !!fieldError;
        const parsedDate = value ? new Date(value as string) : undefined;
        const selectedDate =
          parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

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

            <Popover>
              <PopoverTrigger
                ref={ref}
                type="button"
                disabled={disabled}
                aria-invalid={hasError}
                className={cn(
                  "flex h-12 w-full items-center justify-between rounded-[--radius-lg] border border-app-border bg-app-card px-4 text-left text-xiv text-app-text transition-colors focus-visible:border-app-primary",
                  !selectedDate && "text-app-text-subtle",
                  hasError && "border-app-danger",
                  buttonClassName,
                )}
              >
                <span className="truncate">
                  {selectedDate ? format(selectedDate, "PPP") : placeholder}
                </span>
                <CalendarIcon className="size-4 text-app-text-muted" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  disabled={disableDate}
                  onSelect={(date) => {
                    onChange(date ? format(date, "yyyy-MM-dd") : "");
                    onBlur();
                  }}
                  showOutsideDays={false}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>

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

export default CustomDatePicker;
