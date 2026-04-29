import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { unauthApi } from "@/services/api-service";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import { loginSchema, type LoginFormValues } from "@/modules/auth/utils/validations";

export function useLoginForm() {
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
      toast.success("Login successful");
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to login");
      form.setError("root", { message });
      toast.error(message);
    }
  };

  return {
    form,
    onSubmit,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
