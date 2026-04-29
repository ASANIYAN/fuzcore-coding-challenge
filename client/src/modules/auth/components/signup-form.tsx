import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import { useSignupForm } from "@/modules/auth/hooks/use-signup-form";

export default function SignupForm() {
  const { form, onSubmit, isSubmitting, rootError } = useSignupForm();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <CustomInput control={form.control} name="email" label="Email" placeholder="owner@example.com" type="email" />
      <CustomInput
        control={form.control}
        name="password"
        label="Password"
        placeholder="Create a password"
        type="password"
      />
      {rootError ? <p className="text-xii text-app-danger">{rootError}</p> : null}
      <CustomButton type="submit" loading={isSubmitting} fullWidth>
        Create account
      </CustomButton>
    </form>
  );
}
