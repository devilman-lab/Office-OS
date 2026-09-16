"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X, Compass, ArrowUpRight, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoGuide } from "./demo-guide-provider";
import { DEMO_STEPS } from "./steps";
import { cn } from "@/lib/utils";

export function DemoGuidePanel() {
  const guide = useDemoGuide();
  const pathname = usePathname();
  const [minimized, setMinimized] = React.useState(false);
  if (!guide.active) return null;
  const step = DEMO_STEPS[guide.step - 1];
  const route = guide.currentRoute();
  const onWrongPage = route && route.split("?")[0] !== pathname;
  const pct = Math.round((guide.step / DEMO_STEPS.length) * 100);

  if (minimized) {
    return (
      <button onClick={() => setMinimized(false)} className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-2 text-xs font-medium text-brand-800 shadow-lg hover:bg-brand-50">
        <Compass className="h-3.5 w-3.5" /> ガイド {guide.step}/{DEMO_STEPS.length}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[380px] rounded-lg border border-brand-200 bg-white shadow-2xl animate-fade-in-up">
      <div className="flex items-center justify-between rounded-t-lg border-b border-brand-100 bg-brand-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
          <Compass className="h-4 w-4" /> Guided Demo
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-brand-700">STEP {guide.step} / {DEMO_STEPS.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="rounded p-1 text-brand-500 hover:bg-brand-100" aria-label="最小化"><Minus className="h-3.5 w-3.5" /></button>
          <button onClick={guide.stop} className="rounded p-1 text-brand-500 hover:bg-brand-100" aria-label="終了"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="h-1 w-full bg-brand-100"><div className="h-1 bg-brand-600 transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">{step.title}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{step.body}</p>
        {onWrongPage && (
          <a href={route!} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
            このステップの画面へ移動 <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        {!route && step.route !== null && (
          <div className="mt-2 text-[11px] text-amber-700">前のステップの操作（AI整理／承認）が完了すると、この画面へ移動できます。</div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
        <div className="flex gap-0.5">
          {DEMO_STEPS.map((s) => (
            <button key={s.id} onClick={() => guide.goTo(s.id)} className={cn("h-1.5 w-2.5 rounded-sm", s.id === guide.step ? "bg-brand-600" : s.id < guide.step ? "bg-brand-300" : "bg-slate-200")} aria-label={`step ${s.id}`} />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="xs" variant="ghost" onClick={guide.prev} disabled={guide.step === 1} icon={<ChevronLeft className="h-3.5 w-3.5" />}>前へ</Button>
          {guide.step < DEMO_STEPS.length ? (
            <Button size="xs" onClick={guide.next}>次へ <ChevronRight className="h-3.5 w-3.5" /></Button>
          ) : (
            <Button size="xs" variant="success" onClick={guide.stop}>デモを終了</Button>
          )}
        </div>
      </div>
    </div>
  );
}
