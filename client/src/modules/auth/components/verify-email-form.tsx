import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import { useVerifyEmailForm } from "@/modules/auth/hooks/use-verify-email-form";

type VerifyEmailFormProps = {
  initialEmail?: string;
};

export default function VerifyEmailForm({ initialEmail = "" }: VerifyEmailFormProps) {
  const { form, onSubmit, isSubmitting, rootError } = useVerifyEmailForm(initialEmail);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <CustomInput control={form.control} name="email" label="Email" placeholder="owner@example.com" type="email" />
      <CustomInput control={form.control} name="code" label="Verification code" placeholder="123456" type="text" />
      {rootError ? <p className="text-xii text-app-danger">{rootError}</p> : null}
      <CustomButton type="submit" loading={isSubmitting} fullWidth>
        Verify email
      </CustomButton>
    </form>
  );
}
