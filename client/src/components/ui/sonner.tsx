import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-app-border bg-app-card text-app-text shadow-card font-sans text-xiii tracking-[-0.01em]",
          title: "font-semibold text-app-text",
          description: "text-xii text-app-text-muted",
          success:
            "!border-app-success-border !bg-app-success-dim !text-app-success",
          error: "!border-app-danger !bg-app-danger !text-white",
          warning:
            "!border-app-warning-border !bg-app-warning-dim !text-app-warning",
          info: "!border-app-info-border !bg-app-info-dim !text-app-info-text",
          actionButton: "bg-app-primary text-white hover:bg-app-primary-hover",
          cancelButton:
            "border border-app-secondary-border bg-app-secondary text-app-secondary-text hover:bg-app-secondary-hover",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
