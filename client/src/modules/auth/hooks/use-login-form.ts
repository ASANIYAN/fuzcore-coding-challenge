import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { SESSION_STATUS_QUERY_KEY } from "@/modules/auth/hooks/use-session-status";
import { unauthApi } from "@/services/api-service";
import { loginSchema, type LoginFormValues } from "@/modules/auth/utils/validations";

export function useLoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await unauthApi.post("/auth/login", values);
      await queryClient.invalidateQueries({ queryKey: SESSION_STATUS_QUERY_KEY });
      toast.success("Login successful");
      void navigate("/dashboard");
    } catch (error) {
      applyApiFormErrors(form, error, "Unable to login");
      toast.error("Unable to login. Please check your details and try again.");
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
