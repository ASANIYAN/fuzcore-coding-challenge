import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import CustomAmountInput from "@/components/custom/custom-amount-input";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { parseAmountInput } from "@/lib/amount-input";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import type { Customer } from "@/modules/customers/types";
import type { CurrencyItem } from "@/modules/currencies/hooks/use-currencies";
import type { Invoice } from "@/modules/invoices/types";
import {
  invoiceFormSchema,
  type CreateInvoicePayload,
  type InvoiceFormValues,
} from "@/modules/invoices/utils/validations";

type InvoiceFormProps = {
  mode: "create" | "edit";
  initialValue?: Invoice | null;
  customers: Customer[];
  currencies: CurrencyItem[];
  isSubmitting?: boolean;
  onSubmit: (payload: CreateInvoicePayload) => Promise<void>;
};

function toDateInput(isoDate: string) {
  return new Date(isoDate).toISOString().slice(0, 10);
}

function toIsoDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export default function InvoiceForm({
  mode,
  initialValue,
  customers,
  currencies,
  isSubmitting = false,
  onSubmit,
}: InvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    mode: "onChange",
    defaultValues: {
      customerId: "",
      currency: currencies[0]?.code ?? "USD",
      taxRate: 0,
      issueDate: toDateInput(new Date().toISOString()),
      dueDate: null,
      notes: null,
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: "",
          sortOrder: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    form.reset({
      customerId: initialValue.customerId,
      currency: initialValue.currency,
      taxRate: initialValue.taxRate ?? 0,
      issueDate: toDateInput(initialValue.issueDate),
      dueDate: initialValue.dueDate ? toDateInput(initialValue.dueDate) : null,
      notes: initialValue.notes,
      items: initialValue.items.map((item, index) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: String(item.unitPrice),
        sortOrder: index,
      })),
    });
  }, [form, initialValue]);

  const watchedItems = form.watch("items");
  const watchedTaxRate = Number(form.watch("taxRate") ?? 0);

  const totals = useMemo(() => {
    const subtotal = (watchedItems ?? []).reduce((sum, item) => {
      const quantity = Number(item?.quantity ?? 0);
      const unitPrice = parseAmountInput(item?.unitPrice ?? 0);
      return sum + quantity * (Number.isFinite(unitPrice) ? unitPrice : 0);
    }, 0);
    const taxAmount = subtotal * (Math.max(watchedTaxRate, 0) / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [watchedItems, watchedTaxRate]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const parsed = invoiceFormSchema.parse(values);
      const payload: CreateInvoicePayload = {
        customerId: parsed.customerId,
        currency: parsed.currency,
        taxRate: parsed.taxRate == null ? null : Number(parsed.taxRate),
        issueDate: toIsoDate(parsed.issueDate),
        dueDate: parsed.dueDate ? toIsoDate(parsed.dueDate) : null,
        notes: parsed.notes ?? null,
        items: parsed.items.map((item, index) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          sortOrder: index,
        })),
      };

      await onSubmit(payload);
    } catch (error) {
      applyApiFormErrors(
        form,
        error,
        getApiErrorMessage(error, "Unable to save invoice"),
      );
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 md:grid-cols-3">
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
        <CustomSelect
          control={form.control}
          name="currency"
          label="Currency"
          options={currencies.map((currency) => ({
            value: currency.code,
            label: `${currency.code} - ${currency.name}`,
          }))}
          placeholder="Select currency"
          disabled={mode === "edit"}
          description={
            mode === "edit"
              ? "Currency cannot be changed for existing invoices."
              : undefined
          }
        />
        <CustomInput
          control={form.control}
          name="taxRate"
          label="Tax rate (%)"
          type="number"
          placeholder="7.5"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="issueDate"
          label="Issue date"
          type="date"
        />
        <CustomInput
          control={form.control}
          name="dueDate"
          label="Due date"
          type="date"
        />
      </div>

      <CustomInput
        control={form.control}
        name="notes"
        label="Notes"
        placeholder="Thank you for your business."
      />

      <div className="space-y-3 rounded-[--radius-lg] border border-app-border bg-app-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xiv font-semibold text-app-text">
            Invoice items
          </h3>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                description: "",
                quantity: 1,
                unitPrice: "",
                sortOrder: fields.length,
              })
            }
          >
            Add item
          </CustomButton>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <CustomInput
                control={form.control}
                name={`items.${index}.description`}
                label={`Item ${index + 1} description`}
                placeholder="Design services"
              />
            </div>
            <div className="md:col-span-2">
              <CustomInput
                control={form.control}
                name={`items.${index}.quantity`}
                label="Qty"
                type="number"
                placeholder="1"
              />
            </div>
            <div className="md:col-span-3">
              <CustomAmountInput
                control={form.control}
                name={`items.${index}.unitPrice`}
                label="Unit price"
                placeholder="500"
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <CustomButton
                type="button"
                variant="danger"
                size="sm"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
              >
                Remove
              </CustomButton>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
        <h3 className="mb-2 text-xiv font-semibold text-app-text">
          Totals preview
        </h3>
        <div className="grid gap-1 text-xiii text-app-text-muted">
          <p>Subtotal: {totals.subtotal.toFixed(2)}</p>
          <p>Tax: {totals.taxAmount.toFixed(2)}</p>
          <p className="font-medium text-app-text">
            Total: {totals.total.toFixed(2)}
          </p>
        </div>
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
        {mode === "create" ? "Create invoice" : "Save invoice"}
      </CustomButton>
    </form>
  );
}
