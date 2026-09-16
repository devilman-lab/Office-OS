"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";

export { buttonClass } from "./button-class";
export type { ButtonSize, ButtonVariant } from "./button-class";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ href, variant = "outline", size = "md", className, icon, children, id }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; icon?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <Link id={id} href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
