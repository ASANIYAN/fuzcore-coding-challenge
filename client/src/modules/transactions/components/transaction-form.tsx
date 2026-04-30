import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import CustomAmountInput from "@/components/custom/custom-amount-input";
import { CustomButton } from "@/components/custom/custom-button";
import CustomDatePicker from "@/components/custom/custom-date-picker";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import CustomTimePicker from "@/components/custom/custom-time-picker";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import type { Category } from "@/modules/categories/types";
import type { Customer } from "@/modules/customers/types";
import type { CurrencyItem } from "@/modules/currencies/hooks/use-currencies";
import type { Transaction } from "@/modules/transactions/types";
import {
  transactionFormSchema,
  transactionTypeOptions,
  type CreateTransactionPayload,
  type TransactionFormValues,
} from "@/modules/transactions/utils/validations";

type TransactionFormProps = {
  mode: "create" | "edit";
  initialValue?: Transaction | null;
  categories: Category[];
  customers: Customer[];
  currencies: CurrencyItem[];
  isSubmitting?: boolean;
  onSubmit: (payload: CreateTransactionPayload) => Promise<void>;
};

function toDateTimeLocalInput(isoString: string) {
  const date = new Date(isoString);
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().slice(0, 16);
}

function toDateInput(isoString: string) {
  return toDateTimeLocalInput(isoString).slice(0, 10);
}

function toTimeInput(isoString: string) {
  const localDateTime = toDateTimeLocalInput(isoString);
  const [hourString = "00", minute = "00"] = localDateTime
    .slice(11, 16)
    .split(":");
  const hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${String(normalizedHour).padStart(2, "0")}:${minute} ${period}`;
}

function fromDateAndTimeInput(dateValue: string, timeValue: string) {
  const [timePart = "12:00", period = "AM"] = timeValue.split(" ");
  const [rawHour = "12", minute = "00"] = timePart.split(":");
  const hour = Number(rawHour);
  const normalizedHour =
    period === "PM" ? (hour % 12) + 12 : hour === 12 ? 0 : hour;

  return new Date(
    `${dateValue}T${String(normalizedHour).padStart(2, "0")}:${minute}:00`,
  ).toISOString();
}

function disableFutureTransactionDates(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date > today;
}

export default function TransactionForm({
  mode,
  initialValue,
  categories,
  customers,
  currencies,
  isSubmitting = false,
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    mode: "onChange",
    defaultValues: {
      customerId: "",
      categoryId: "",
      amount: "",
      currency: currencies[0]?.code ?? "USD",
      description: null,
      reference: null,
      transactionDate: toDateInput(new Date().toISOString()),
      transactionTime: toTimeInput(new Date().toISOString()),
    },
  });

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    form.reset({
      customerId: initialValue.customerId ?? "",
      categoryId: initialValue.categoryId,
      amount: String(initialValue.amount),
      currency: initialValue.currency,
      description: initialValue.description,
      reference: initialValue.reference,
      transactionDate: toDateInput(initialValue.transactionDate),
      transactionTime: toTimeInput(initialValue.transactionDate),
    });
  }, [form, initialValue]);

  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  const availableCategories = useMemo(() => {
    if (!selectedCategory) {
      return categories;
    }

    return categories.filter(
      (category) => category.type === selectedCategory.type,
    );
  }, [categories, selectedCategory]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload: CreateTransactionPayload = {
        customerId: values.customerId,
        categoryId: values.categoryId,
        amount: Number(values.amount),
        currency: values.currency,
        description: values.description ?? null,
        reference: values.reference ?? null,
        transactionDate: fromDateAndTimeInput(
          values.transactionDate,
          values.transactionTime,
        ),
      };

      await onSubmit(payload);
      if (mode === "create") {
        form.reset({
          customerId: "",
          categoryId: "",
          amount: "",
          currency: currencies[0]?.code ?? "USD",
          description: null,
          reference: null,
          transactionDate: toDateInput(new Date().toISOString()),
          transactionTime: toTimeInput(new Date().toISOString()),
        });
      }
    } catch (error) {
      applyApiFormErrors(
        form,
        error,
        getApiErrorMessage(error, "Unable to save transaction"),
      );
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-3">
        <CustomSelect
          control={form.control}
          name="categoryId"
          label="Category"
          options={availableCategories.map((category) => ({
            value: category.id,
            label: `${category.name} (${category.type})`,
          }))}
          placeholder="Select category"
        />
        <CustomAmountInput
          control={form.control}
          name="amount"
          label="Amount"
          placeholder="1250.5"
        />
        <CustomSelect
          control={form.control}
          name="currency"
          label="Currency"
          options={currencies.map((currency) => ({
            value: currency.code,
            label: `${currency.code} - ${currency.name}`,
          }))}
          placeholder="Select currency"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomSelect
          control={form.control}
          name="customerId"
          label="Customer"
          options={customers.map((customer) => ({
            value: customer.id,
            label: `${customer.displayName} (${customer.email})`,
          }))}
          placeholder="Select customer"
        />
        <CustomDatePicker
          control={form.control}
          name="transactionDate"
          label="Transaction date"
          placeholder="Select date"
          disableDate={disableFutureTransactionDates}
        />
      </div>

      <CustomTimePicker
        control={form.control}
        name="transactionTime"
        label="Transaction time"
        placeholder="Select time"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="reference"
          label="Reference"
          placeholder="INV-2026-0001"
        />
        <CustomInput
          control={form.control}
          name="description"
          label="Description"
          placeholder="Project milestone payment"
        />
      </div>

      {form.formState.errors.root?.message ? (
        <p className="text-xii text-app-danger">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <CustomButton
        type="submit"
        loading={isSubmitting || form.formState.isSubmitting}
      >
        {mode === "create" ? "Create transaction" : "Save changes"}
      </CustomButton>
    </form>
  );
}
