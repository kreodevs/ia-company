import type { InputHTMLAttributes } from "react";
import InputText from "@/components/atoms/InputText";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
  return <InputText label={label} className={className} {...props} />;
}
