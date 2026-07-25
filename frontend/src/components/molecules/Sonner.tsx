import type { ComponentProps } from "react";
import { Toaster as SonnerToaster, toast } from "sonner";
import { useTheme } from "../../context/ThemeContext";
import type { AppTheme } from "../../lib/theme";

type ToasterProps = ComponentProps<typeof SonnerToaster>;

function sonnerTheme(appTheme: AppTheme): ToasterProps["theme"] {
  return appTheme === "letter" ? "light" : "dark";
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={sonnerTheme(theme)}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
