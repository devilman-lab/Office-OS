"use client";

import { ShieldCheck, EyeOff } from "lucide-react";
import type { MaskedEntity } from "@/domain/types";
import { Badge, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<MaskedEntity["type"], string> = { PERSON: "氏名", ORGANIZATION: "組織", PHONE: "電話番号", EMAIL: "メール", ADDRESS: "住所" };
const TYPE_TONE: Record<MaskedEntity["type"], string> = {
  PERSON: "bg-rose-100 text-rose-800",
  ORGANIZATION: "bg-sky-100 text-sky-800",
  PHONE: "bg-emerald-100 text-emerald-800",
  EMAIL: "bg-violet-100 text-violet-800",
  ADDRESS: "bg-amber-100 text-amber-800",
};

/** Highlights originals on the left and tokens on the right so the reviewer can verify masking coverage. */
export function MaskingView({ original, masked, entities, counts }: { original: string; masked: string; entities: MaskedEntity[]; counts: Record<MaskedEntity["type"], number> }) {
  const total = entities.length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="success" mono><ShieldCheck className="h-3 w-3" /> PII MASKING COMPLETED</Badge>
        {(Object.keys(counts) as MaskedEntity["type"][]).map((k) => (
          <span key={k} className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", counts[k] > 0 ? TYPE_TONE[k] : "bg-slate-100 text-slate-400")}>{k} {counts[k]}</span>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">{total} 件の個人情報をトークン化。AI には右側の文章のみ渡されます。</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
            <SectionLabel>Original Input（原本 — 担当者のみ閲覧）</SectionLabel>
            <Badge tone="danger" mono>NOT SENT TO AI</Badge>
          </div>
          <div className="whitespace-pre-wrap px-3 py-3 text-[13px] leading-relaxed text-slate-800">{highlight(original, entities, "original")}</div>
        </div>
        <div className="rounded-md border border-emerald-200">
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-3 py-2">
            <SectionLabel className="text-emerald-700">AI Processing Input（匿名化済み）</SectionLabel>
            <Badge tone="success" mono><EyeOff className="h-3 w-3" /> SENT TO AI</Badge>
          </div>
          <div className="whitespace-pre-wrap px-3 py-3 text-[13px] leading-relaxed text-slate-800">{highlight(masked, entities, "token")}</div>
        </div>
      </div>
      {entities.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-1.5 text-left">Type</th><th className="px-3 py-1.5 text-left">Token</th><th className="px-3 py-1.5 text-left">Original（担当者のみ）</th></tr>
            </thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.token} className="border-t border-slate-100">
                  <td className="px-3 py-1.5"><span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", TYPE_TONE[e.type])}>{TYPE_LABEL[e.type]}</span></td>
                  <td className="px-3 py-1.5 font-mono text-slate-700">{e.token}</td>
                  <td className="px-3 py-1.5 text-slate-600">{e.original}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function highlight(text: string, entities: MaskedEntity[], mode: "original" | "token") {
  if (entities.length === 0) return text;
  const needles = entities.map((e) => ({ needle: mode === "original" ? e.original : e.token, type: e.type })).filter((n) => n.needle).sort((a, b) => b.needle.length - a.needle.length);
  const parts: React.ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length) {
    let best: { idx: number; n: (typeof needles)[number] } | null = null;
    for (const n of needles) {
      const idx = rest.indexOf(n.needle);
      if (idx >= 0 && (best === null || idx < best.idx)) best = { idx, n };
    }
    if (!best) { parts.push(rest); break; }
    if (best.idx > 0) parts.push(rest.slice(0, best.idx));
    parts.push(<mark key={key++} className={cn("rounded px-0.5", TYPE_TONE[best.n.type], mode === "token" && "font-mono text-[12px]")}>{best.n.needle}</mark>);
    rest = rest.slice(best.idx + best.n.needle.length);
  }
  return parts;
}
