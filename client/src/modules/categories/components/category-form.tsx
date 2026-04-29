import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import CustomSelect from "@/components/custom/custom-select";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import type { Category } from "@/modules/categories/types";
import {
  categoryTypeOptions,
  createCategorySchema,
  type CreateCategoryPayload,
} from "@/modules/categories/utils/validations";

type CategoryFormProps = {
  mode: "create" | "edit";
  initialValue?: Category | null;
  isSubmitting?: boolean;
  onSubmit: (payload: CreateCategoryPayload) => Promise<void>;
};

export default function CategoryForm({
  mode,
  initialValue,
  isSubmitting = false,
  onSubmit,
}: CategoryFormProps) {
  const form = useForm<CreateCategoryPayload>({
    resolver: zodResolver(createCategorySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: "income",
    },
  });

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    form.reset({
      name: initialValue.name,
      type: initialValue.type,
    });
  }, [form, initialValue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      if (mode === "create") {
        form.reset();
      }
    } catch (error) {
      applyApiFormErrors(form, error, getApiErrorMessage(error, "Unable to save category"));
    }
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <CustomInput control={form.control} name="name" label="Category name" placeholder="Consulting" />
        <CustomSelect
          control={form.control}
          name="type"
          label="Category type"
          options={[...categoryTypeOptions]}
          placeholder="Select type"
          disabled={mode === "edit"}
          description={mode === "edit" ? "Type is fixed for existing categories." : undefined}
        />
      </div>

      {form.formState.errors.root?.message ? (
        <p className="text-xii text-app-danger">{form.formState.errors.root.message}</p>
      ) : null}

      <CustomButton type="submit" loading={isSubmitting || form.formState.isSubmitting}>
        {mode === "create" ? "Create category" : "Save changes"}
      </CustomButton>
    </form>
  );
}
