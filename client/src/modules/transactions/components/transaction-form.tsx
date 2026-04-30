import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import CustomAmountInput from "@/components/custom/custom-amount-input";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
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

function fromDateTimeLocalInput(value: string) {
  return new Date(value).toISOString();
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
      transactionDate: toDateTimeLocalInput(new Date().toISOString()),
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
      transactionDate: toDateTimeLocalInput(initialValue.transactionDate),
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
      const parsed = transactionFormSchema.parse(values);

      const payload: CreateTransactionPayload = {
        customerId: parsed.customerId,
        categoryId: parsed.categoryId,
        amount: parsed.amount,
        currency: parsed.currency,
        description: parsed.description ?? null,
        reference: parsed.reference ?? null,
        transactionDate: fromDateTimeLocalInput(parsed.transactionDate),
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
          transactionDate: toDateTimeLocalInput(new Date().toISOString()),
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
        <CustomInput
          control={form.control}
          name="transactionDate"
          label="Transaction date"
          type="datetime-local"
          inputClassName="[&::-webkit-calendar-picker-indicator]:opacity-80"
        />
      </div>

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

      {selectedCategory ? (
        <p className="text-xii text-app-text-muted">
          Transaction type is inferred from selected category:{" "}
          <strong>{selectedCategory.type}</strong>.
        </p>
      ) : null}

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
