import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { CustomButton } from "@/components/custom/custom-button";
import { getApiErrorMessage } from "@/lib/get-api-error-message";
import { unauthApi } from "@/services/api-service";

type EmailVerificationModalProps = {
  open: boolean;
  email: string;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
};

export default function EmailVerificationModal({
  open,
  email,
  onOpenChange,
  onVerified,
}: EmailVerificationModalProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const verify = async () => {
    if (!email) {
      toast.error("Email is required to verify your account.");
      return;
    }

    if (code.trim().length < 4) {
      toast.error("Please enter a valid verification code.");
      return;
    }

    try {
      setIsVerifying(true);
      await unauthApi.post("/auth/verify-email", {
        email,
        code,
      });
      setCode("");
      toast.success("Email verified successfully.");
      onVerified();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Verification failed. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (!email) {
      toast.error("Email is required to resend verification code.");
      return;
    }

    try {
      setIsResending(true);
      await unauthApi.post("/auth/resend-verification", { email });
      toast.success("Verification code sent.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to resend verification code."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify your email</DialogTitle>
          <DialogDescription>
            Enter the verification code sent to <span className="font-semibold text-app-text">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            pattern="^[0-9A-Za-z]+$"
          >
            <InputOTPGroup className="w-full justify-center">
              <InputOTPSlot index={0} className="text-app-primary" />
              <InputOTPSlot index={1} className="text-app-primary" />
              <InputOTPSlot index={2} className="text-app-primary" />
              <InputOTPSlot index={3} className="text-app-primary" />
              <InputOTPSlot index={4} className="text-app-primary" />
              <InputOTPSlot index={5} className="text-app-primary" />
            </InputOTPGroup>
          </InputOTP>

          <button
            type="button"
            onClick={() => void resend()}
            disabled={isResending}
            className="text-xii text-app-primary transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {isResending ? "Resending..." : "Resend code"}
          </button>
        </div>

        <DialogFooter>
          <CustomButton
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isVerifying || isResending}
          >
            Cancel
          </CustomButton>
          <CustomButton type="button" loading={isVerifying} onClick={() => void verify()}>
            Verify account
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
