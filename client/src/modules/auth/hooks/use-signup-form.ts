import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { SESSION_STATUS_QUERY_KEY } from "@/modules/auth/hooks/use-session-status";
import { unauthApi } from "@/services/api-service";
import { signupSchema, type SignupFormValues } from "@/modules/auth/utils/validations";

export function useSignupForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await unauthApi.post("/auth/signup", values);
      await queryClient.invalidateQueries({ queryKey: SESSION_STATUS_QUERY_KEY });
      toast.success("Account created. Please verify your email.");
      void navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      applyApiFormErrors(form, error, "Unable to create account");
      toast.error("Unable to create account. Please review your details.");
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
