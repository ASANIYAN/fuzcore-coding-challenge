import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { unauthApi } from "@/services/api-service";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/modules/auth/utils/validations";

export function useResetPasswordForm(initialEmail = "") {
  const navigate = useNavigate();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: initialEmail,
      code: "",
      newPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await unauthApi.post("/auth/reset-password", values);
      toast.success("Password reset successful. You can now sign in.");
      void navigate("/login");
    } catch (error) {
      applyApiFormErrors(form, error, "Unable to reset password");
      toast.error("Unable to reset password. Please review your details.");
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
