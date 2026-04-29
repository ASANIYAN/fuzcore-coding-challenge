import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import { useForgotPasswordForm } from "@/modules/auth/hooks/use-forgot-password-form";

export default function ForgotPasswordForm() {
  const { form, onSubmit, isSubmitting, rootError } = useForgotPasswordForm();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <CustomInput control={form.control} name="email" label="Email" placeholder="owner@example.com" type="email" />
      {rootError ? <p className="text-xii text-app-danger">{rootError}</p> : null}
      <CustomButton type="submit" loading={isSubmitting} fullWidth>
        Send reset code
      </CustomButton>
    </form>
  );
}
