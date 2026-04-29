import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { unauthApi } from "@/services/api-service";
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from "@/modules/auth/utils/validations";

export function useVerifyEmailForm(initialEmail = "") {
  const navigate = useNavigate();

  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    mode: "onChange",
    defaultValues: {
      email: initialEmail,
      code: "",
    },
  });

  const onSubmit = async (values: VerifyEmailFormValues) => {
    try {
      await unauthApi.post("/auth/verify-email", values);
      toast.success("Email verified successfully");
      void navigate("/dashboard");
    } catch (error) {
      applyApiFormErrors(form, error, "Unable to verify email");
      toast.error("Verification failed. Please check your code and try again.");
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
