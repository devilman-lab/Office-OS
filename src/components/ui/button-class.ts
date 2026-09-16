import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 border border-brand-700 shadow-sm disabled:bg-brand-300 disabled:border-brand-300",
  secondary: "bg-slate-800 text-white hover:bg-slate-900 border border-slate-800 shadow-sm",
  outline: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-sm",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 shadow-sm disabled:bg-emerald-300 disabled:border-emerald-300",
};

const SIZE: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-sm gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-10 px-5 text-sm gap-2 rounded-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}
