import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type CustomSpinnerProps = React.ComponentProps<typeof Spinner>;

export function CustomSpinner({ className, ...props }: CustomSpinnerProps) {
  return <Spinner className={cn("size-4", className)} {...props} />;
}
