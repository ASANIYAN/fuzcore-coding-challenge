import { Clock3 } from "lucide-react";
import { type RefObject, useEffect, useRef } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"] as const;

type TimePeriod = (typeof PERIODS)[number];

function parseTimeValue(value: string | null | undefined) {
  if (!value) {
    return { hour: "12", minute: "00", period: "AM" as TimePeriod };
  }

  const [timePart = "12:00", periodPart = "AM"] = value.split(" ");
  const [hour = "12", minute = "00"] = timePart.split(":");

  return {
    hour,
    minute,
    period: PERIODS.includes(periodPart as TimePeriod)
      ? (periodPart as TimePeriod)
      : ("AM" as TimePeriod),
  };
}

function formatTimeValue(hour: string, minute: string, period: TimePeriod) {
  return `${hour}:${minute} ${period}`;
}

interface CustomTimePickerProps<T extends FieldValues> {
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
}

export function CustomTimePicker<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select time",
  disabled = false,
  containerClassName,
  labelClassName,
  buttonClassName,
  errorClassName,
  description,
  error,
}: CustomTimePickerProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value, ref },
        fieldState: { error: fieldError },
      }) => {
        const hasError = !!error || !!fieldError;
        const selectedTime = parseTimeValue(value as string | null | undefined);
        const displayValue = value ? String(value) : "";

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

            <Popover>
              <PopoverTrigger
                ref={ref}
                type="button"
                disabled={disabled}
                aria-invalid={hasError}
                className={cn(
                  "flex h-12 w-full items-center justify-between rounded-[--radius-lg] border border-app-border bg-app-card px-4 text-left text-xiv text-app-text transition-opacity duration-fast focus-visible:border-app-primary hover:opacity-90",
                  !displayValue && "text-app-text-subtle",
                  hasError && "border-app-danger",
                  buttonClassName,
                )}
              >
                <span className="truncate">{displayValue || placeholder}</span>
                <Clock3 className="size-4 text-app-text/70" />
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(20rem,calc(100vw-2rem))] border-app-border bg-app-card p-4 text-app-text shadow-dropdown"
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <TimePickerContent
                  value={selectedTime}
                  onChange={(nextValue) => {
                    onChange(nextValue);
                    onBlur();
                  }}
                />
              </PopoverContent>
            </Popover>

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

function TimePickerContent({
  value,
  onChange,
}: {
  value: { hour: string; minute: string; period: TimePeriod };
  onChange: (nextValue: string) => void;
}) {
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hourElement = hourRef.current?.querySelector<HTMLElement>(
      `[data-hour="${value.hour}"]`,
    );
    const minuteElement = minuteRef.current?.querySelector<HTMLElement>(
      `[data-minute="${value.minute}"]`,
    );

    hourElement?.scrollIntoView({ block: "center" });
    minuteElement?.scrollIntoView({ block: "center" });
  }, [value.hour, value.minute]);

  const updateTime = (
    updates: Partial<{ hour: string; minute: string; period: TimePeriod }>,
  ) => {
    onChange(
      formatTimeValue(
        updates.hour ?? value.hour,
        updates.minute ?? value.minute,
        updates.period ?? value.period,
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xii text-app-text-muted">Selected time</p>
          <p className="text-xviii font-semibold text-app-text">
            {formatTimeValue(value.hour, value.minute, value.period)}
          </p>
        </div>
        <div className="inline-flex rounded-[--radius-md] border border-app-border bg-app-surface p-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => updateTime({ period })}
              className={cn(
                "rounded-[--radius-sm] px-3 py-1.5 text-xii font-medium transition-colors",
                value.period === period
                  ? "bg-app-primary text-white"
                  : "text-app-text-muted hover:bg-app-primary-dim hover:text-app-text",
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PickerColumn
          label="Hour"
          items={HOURS}
          selectedValue={value.hour}
          dataAttribute="data-hour"
          listRef={hourRef}
          onSelect={(hour) => updateTime({ hour })}
        />
        <PickerColumn
          label="Minute"
          items={MINUTES}
          selectedValue={value.minute}
          dataAttribute="data-minute"
          listRef={minuteRef}
          onSelect={(minute) => updateTime({ minute })}
        />
      </div>
    </div>
  );
}

function PickerColumn({
  label,
  items,
  selectedValue,
  dataAttribute,
  listRef,
  onSelect,
}: {
  label: string;
  items: string[];
  selectedValue: string;
  dataAttribute: "data-hour" | "data-minute";
  listRef: RefObject<HTMLDivElement>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-xii text-app-text-muted">{label}</p>
      <div
        ref={listRef}
        className="h-44 overflow-y-auto rounded-[--radius-lg] border border-app-border bg-app-surface p-2"
      >
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              {...{ [dataAttribute]: item }}
              onClick={() => onSelect(item)}
              className={cn(
                "rounded-[--radius-md] px-3 py-2 text-center text-xiii transition-colors",
                selectedValue === item
                  ? "bg-app-primary text-white"
                  : "text-app-text hover:bg-app-primary-dim",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CustomTimePicker;
