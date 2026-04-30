import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { applyApiFormErrors } from "@/lib/apply-api-form-errors";
import { SESSION_STATUS_QUERY_KEY } from "@/modules/auth/hooks/use-session-status";
import { unauthApi } from "@/services/api-service";
import { loginSchema, type LoginFormValues } from "@/modules/auth/utils/validations";

export function useLoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const email = searchParams.get("email");
    const unverified = searchParams.get("unverified");
    if (!email) {
      return;
    }

    form.setValue("email", email);
    if (unverified === "1") {
      setVerificationEmail(email);
      setIsVerificationModalOpen(true);
    }
  }, [form, searchParams]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await unauthApi.post<{
        success: true;
        data: {
          user: {
            id: string;
            email: string;
            emailVerifiedAt: string | null;
          };
          message: string;
        };
      }>("/auth/login", values);

      const sessionResponse = await unauthApi.get<{
        success: true;
        data: {
          authenticated: boolean;
          user: {
            id: string;
            email: string;
            emailVerifiedAt: string | null;
          } | null;
        };
      }>("/auth/session", {
        params: { t: Date.now() },
      });

      if (!sessionResponse.data.data.authenticated || !sessionResponse.data.data.user) {
        throw new Error("Your session could not be established. Please try signing in again.");
      }

      queryClient.setQueryData(SESSION_STATUS_QUERY_KEY, sessionResponse.data.data);
      toast.success("Login successful");
      void navigate("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error
          ?.code;

        if (code === "USER_NOT_VERIFIED") {
          try {
            await unauthApi.post("/auth/resend-verification", { email: values.email });
            toast.info("A fresh verification code has been sent to your email.");
          } catch {
            // no-op: modal still opens so user can try existing valid code
          }
          setVerificationEmail(values.email);
          setIsVerificationModalOpen(true);
          return;
        }
      }

      applyApiFormErrors(form, error, "Unable to login");
      toast.error("Unable to login. Please check your details and try again.");
    }
  };

  return {
    form,
    onSubmit,
    verificationEmail,
    isVerificationModalOpen,
    setIsVerificationModalOpen,
    rootError: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
  };
}
