import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import { useResetPasswordForm } from "@/modules/auth/hooks/use-reset-password-form";

type ResetPasswordFormProps = {
  initialEmail?: string;
};

export default function ResetPasswordForm({ initialEmail = "" }: ResetPasswordFormProps) {
  const { form, onSubmit, isSubmitting, rootError } = useResetPasswordForm(initialEmail);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <CustomInput control={form.control} name="email" label="Email" placeholder="owner@example.com" type="email" />
      <CustomInput control={form.control} name="code" label="Reset code" placeholder="123456" type="text" />
      <CustomInput
        control={form.control}
        name="newPassword"
        label="New password"
        placeholder="Enter your new password"
        type="password"
      />
      {rootError ? <p className="text-xii text-app-danger">{rootError}</p> : null}
      <CustomButton type="submit" loading={isSubmitting} fullWidth>
        Reset password
      </CustomButton>
    </form>
  );
}
