import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import type { Customer } from "@/modules/customers/types";
import {
  createCustomerSchema,
  customerTypeOptions,
  type CustomerFormValues,
  type CreateCustomerPayload,
} from "@/modules/customers/utils/validations";

type CustomerFormProps = {
  mode: "create" | "edit";
  initialValue?: Customer | null;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateCustomerPayload) => Promise<void>;
};

function toFormValue(value: string | null | undefined) {
  return value ?? "";
}

export default function CustomerForm({
  mode,
  initialValue,
  isSubmitting = false,
  onSubmit,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    mode: "onChange",
    defaultValues: {
      displayName: "",
      type: "company",
      email: "",
      companyName: null,
      phone: null,
      taxId: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    },
  });

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    form.reset({
      displayName: initialValue.displayName,
      type: initialValue.type,
      email: initialValue.email,
      companyName: initialValue.companyName,
      phone: initialValue.phone,
      taxId: initialValue.taxId,
      addressLine1: initialValue.addressLine1,
      addressLine2: initialValue.addressLine2,
      city: initialValue.city,
      state: initialValue.state,
      postalCode: initialValue.postalCode,
      country: initialValue.country,
    });
  }, [form, initialValue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = createCustomerSchema.parse(values);
      await onSubmit(payload);
      if (mode === "create") {
        form.reset();
      }
    } catch (error) {
      applyApiFormErrors(form, error, getApiErrorMessage(error, "Unable to save customer"));
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="displayName"
          label="Display name"
          placeholder="Acme Ltd"
        />
        <CustomSelect
          control={form.control}
          name="type"
          label="Type"
          options={[...customerTypeOptions]}
          placeholder="Select customer type"
        />
      </div>

      <CustomInput
        control={form.control}
        name="email"
        label="Email"
        type="email"
        placeholder="billing@example.com"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="companyName"
          label="Company name"
          placeholder="Acme"
          sanitizeValue={toFormValue}
        />
        <CustomInput
          control={form.control}
          name="phone"
          label="Phone"
          placeholder="+2348012345678"
          sanitizeValue={toFormValue}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="taxId"
          label="Tax ID"
          placeholder="Optional"
          sanitizeValue={toFormValue}
        />
        <CustomInput
          control={form.control}
          name="country"
          label="Country"
          placeholder="Nigeria"
          sanitizeValue={toFormValue}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput
          control={form.control}
          name="addressLine1"
          label="Address line 1"
          placeholder="Street address"
          sanitizeValue={toFormValue}
        />
        <CustomInput
          control={form.control}
          name="addressLine2"
          label="Address line 2"
          placeholder="Suite / Apt"
          sanitizeValue={toFormValue}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CustomInput control={form.control} name="city" label="City" placeholder="City" sanitizeValue={toFormValue} />
        <CustomInput control={form.control} name="state" label="State" placeholder="State" sanitizeValue={toFormValue} />
        <CustomInput
          control={form.control}
          name="postalCode"
          label="Postal code"
          placeholder="Postal code"
          sanitizeValue={toFormValue}
        />
      </div>

      {form.formState.errors.root?.message ? (
        <p className="text-xii text-app-danger">{form.formState.errors.root.message}</p>
      ) : null}

      <CustomButton type="submit" loading={isSubmitting || form.formState.isSubmitting}>
        {mode === "create" ? "Create customer" : "Save changes"}
      </CustomButton>
    </form>
  );
}
