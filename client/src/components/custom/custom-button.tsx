import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomSpinner } from "@/components/custom/custom-spinner";

const customButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[--radius-md] font-semibold shadow-button transition-all duration-normal ease-default focus-visible:ring-2 focus-visible:ring-app-focus-ring active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-app-primary !text-white hover:bg-app-primary-hover hover:shadow-md",
        secondary:
          "border border-app-secondary-border bg-app-secondary !text-app-secondary-text hover:bg-app-secondary-hover hover:shadow-sm",
        danger:
          "bg-app-danger !text-white hover:bg-app-danger-hover hover:shadow-sm",
      },
      size: {
        sm: "h-8 px-3 text-xii",
        md: "h-9 px-4 text-xiii",
        lg: "h-10 px-6 text-xiv",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

type CustomButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof customButtonVariants> & {
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

export function CustomButton({
  className,
  variant,
  size,
  loading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  children,
  ...props
}: CustomButtonProps) {
  return (
    <Button
      className={cn(
        customButtonVariants({ variant, size, fullWidth }),
        className,
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <CustomSpinner className="size-4" /> : leftIcon}
      {children}
      {rightIcon}
    </Button>
  );
}
