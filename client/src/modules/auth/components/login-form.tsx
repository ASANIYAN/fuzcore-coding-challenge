import { CustomButton } from "@/components/custom/custom-button";
import CustomInput from "@/components/custom/custom-input";
import { useLoginForm } from "@/modules/auth/hooks/use-login-form";

export default function LoginForm() {
  const { form, onSubmit, isSubmitting, rootError } = useLoginForm();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <CustomInput control={form.control} name="email" label="Email" placeholder="owner@example.com" type="email" />
      <CustomInput
        control={form.control}
        name="password"
        label="Password"
        placeholder="Enter your password"
        type="password"
      />
      {rootError ? <p className="text-xii text-app-danger">{rootError}</p> : null}
      <CustomButton type="submit" loading={isSubmitting} fullWidth>
        Sign in
      </CustomButton>
    </form>
  );
}
