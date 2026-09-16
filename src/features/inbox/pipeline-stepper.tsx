"use client";

import { CheckCircle2, AlertTriangle, XCircle, Circle, Loader2, MinusCircle } from "lucide-react";
import { PIPELINE_STEPS, type PipelineStep } from "@/services/pipeline.types";
import { cn } from "@/lib/utils";

export type StepView = { def: (typeof PIPELINE_STEPS)[number]; index: number; state: "pending" | "running" | "done"; result?: PipelineStep };

/** Vertical stepper that visualises the 9-stage AI pipeline. */
export function PipelineStepper({ steps }: { steps: StepView[] }) {
  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const status = s.result?.status;
        const icon =
          s.state === "pending" ? <Circle className="h-4 w-4 text-slate-300" />
            : s.state === "running" ? <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
              : status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : status === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                  : status === "failed" ? <XCircle className="h-4 w-4 text-red-600" />
                    : <MinusCircle className="h-4 w-4 text-slate-300" />;
        const label =
          s.state === "pending" ? "PENDING" : s.state === "running" ? "RUNNING" : status === "success" ? "SUCCESS" : status === "warning" ? "WARNING" : status === "failed" ? "FAILED" : "SKIPPED";
        const labelCls =
          s.state === "running" ? "text-brand-700" : status === "success" ? "text-emerald-700" : status === "warning" ? "text-amber-700" : status === "failed" ? "text-red-700" : "text-slate-400";
        return (
          <li key={s.def.key} className={cn("relative flex gap-3 pb-3", s.state === "pending" && "opacity-60")}>
            {i < steps.length - 1 && <span className={cn("absolute left-[7px] top-5 h-[calc(100%-4px)] w-px", s.state === "done" ? "bg-slate-300" : "bg-slate-200")} />}
            <span className="relative z-10 mt-0.5 shrink-0 bg-white">{icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-slate-400">{String(s.index).padStart(2, "0")}</span>
                <span className="text-[13px] font-semibold tracking-wide text-slate-800">{s.def.label}</span>
                <span className="text-[11px] text-slate-400">{s.def.labelJa}</span>
                <span className={cn("ml-auto font-mono text-[10px] font-semibold", labelCls)}>{label}</span>
                {s.result && s.state === "done" && s.result.status !== "skipped" && <span className="w-12 text-right font-mono text-[10px] text-slate-400">{s.result.durationMs} ms</span>}
              </div>
              {s.state === "done" && s.result && <div className={cn("mt-0.5 text-[12px] leading-relaxed", status === "failed" ? "text-red-700" : "text-slate-600")}>{s.result.summary}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
