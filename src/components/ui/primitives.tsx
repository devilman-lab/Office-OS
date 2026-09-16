import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------- Card ---------- */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, eyebrow, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-3.5", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</div>}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children, padded = true }: { className?: string; children: React.ReactNode; padded?: boolean }) {
  return <div className={cn(padded && "px-5 py-4", className)}>{children}</div>;
}

/* ---------- Badge ---------- */
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "violet" | "outline";
const TONE: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  outline: "bg-white text-slate-600 border-slate-300",
};

export function Badge({ tone = "neutral", mono, className, children, dot }: { tone?: BadgeTone; mono?: boolean; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap", TONE[tone], mono && "font-mono tracking-wide uppercase", className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : tone === "danger" ? "bg-red-500" : tone === "info" ? "bg-sky-500" : tone === "brand" ? "bg-brand-500" : "bg-slate-400")} />}
      {children}
    </span>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, description, eyebrow, actions, badges }: { title: React.ReactNode; description?: React.ReactNode; eyebrow?: React.ReactNode; actions?: React.ReactNode; badges?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</div>}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {badges}
        </div>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Stat ---------- */
export function StatCard({ label, value, hint, tone = "neutral", icon, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "neutral" | "warning" | "danger" | "success" | "brand"; icon?: React.ReactNode; href?: string }) {
  const accent = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : tone === "brand" ? "text-brand-600" : "text-slate-900";
  const body = (
    <div className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", accent)}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <a href={href} className="block">{body}</a> : body;
}

/* ---------- Table ---------- */
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</thead>;
}
export function TH({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <th className={cn("border-b border-slate-200 px-4 py-2.5 text-left font-semibold", className)}>{children}</th>;
}
export function TR({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr className={cn("border-b border-slate-100 last:border-0 hover:bg-slate-50/70", onClick && "cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
}
export function TD({ className, children, colSpan }: { className?: string; children?: React.ReactNode; colSpan?: number }) {
  return <td className={cn("px-4 py-2.5 align-middle text-slate-700", className)} colSpan={colSpan}>{children}</td>;
}

/* ---------- Empty / Notice / KeyValue ---------- */
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {description && <div className="mt-1 max-w-sm text-xs text-slate-500">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children, icon, className }: { tone?: "info" | "warning" | "danger" | "success" | "neutral"; title?: React.ReactNode; children?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-sm", styles, className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn("text-[13px] leading-relaxed", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}

export function KeyValue({ items, className, dense }: { items: { label: React.ReactNode; value: React.ReactNode }[]; className?: string; dense?: boolean }) {
  return (
    <dl className={cn("grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4", dense ? "gap-y-1.5" : "gap-y-2.5", className)}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt className="text-xs font-medium text-slate-500">{it.label}</dt>
          <dd className="min-w-0 text-sm text-slate-800">{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded bg-slate-200", className)} />;
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-slate-400", className)}>{children}</div>;
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] text-slate-600", className)}>{children}</span>;
}
