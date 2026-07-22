import type { ButtonHTMLAttributes, ReactNode } from "react";
import KreoButton from "@/components/atoms/Button";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const variantMap: Record<ButtonVariant, "default" | "secondary" | "ghost" | "destructive"> = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  fullWidthMobile?: boolean;
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  fullWidthMobile = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <KreoButton
      type={type}
      variant={variantMap[variant]}
      className={`${fullWidthMobile ? "w-full sm:w-auto" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </KreoButton>
  );
}
