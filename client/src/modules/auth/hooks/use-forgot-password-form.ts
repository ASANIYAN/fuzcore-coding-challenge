import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { unauthApi } from "@/services/api-service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/modules/auth/utils/validations";

export function useForgotPasswordForm() {
  const navigate = useNavigate();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await unauthApi.post("/auth/forgot-password", values);
      toast.success("If an account with that email exists, a reset code has been sent.");
      void navigate(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      applyApiFormErrors(form, error, "Unable to process this request");
      toast.error("Unable to process this request right now.");
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
