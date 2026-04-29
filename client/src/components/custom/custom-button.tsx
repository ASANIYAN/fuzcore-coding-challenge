import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomSpinner } from "@/components/custom/custom-spinner";

const customButtonVariants = cva(
  "inline-flex items-center justify-center rounded-[--radius-md] font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-app-primary text-app-primary-text hover:bg-app-primary-hover",
        secondary:
          "border border-app-secondary-border bg-app-secondary text-app-secondary-text hover:bg-app-secondary-hover",
        danger: "bg-app-danger text-white hover:bg-app-danger-hover",
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
      className={cn(customButtonVariants({ variant, size, fullWidth }), className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <CustomSpinner className="size-4" /> : leftIcon}
      {children}
      {rightIcon}
    </Button>
  );
}
