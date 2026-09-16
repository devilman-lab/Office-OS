import { AlertCircle, CalendarDays, User, ListChecks, Building2, Info } from "lucide-react";
import type { AIProposal } from "@/domain/types";
import { PRIORITY_LABEL } from "@/domain/enums";
import { Badge, KeyValue, SectionLabel, Notice } from "@/components/ui/primitives";
import { ConfidenceBadge, PriorityBadge } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { proposalDisplayTitle } from "./display";

export function ProposalSummary({ proposal, customerName, showHeader = true }: { proposal: AIProposal; customerName?: string | null; showHeader?: boolean }) {
  const required = proposal.missingInformation.filter((m) => m.severity === "required");
  const recommended = proposal.missingInformation.filter((m) => m.severity === "recommended");
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="violet" mono>AI GENERATED PROPOSAL</Badge>
          <ConfidenceBadge confidence={proposal.confidence} />
          <span className="font-mono text-[11px] text-slate-400">{proposal.id}</span>
          <span className="text-[11px] text-slate-400">処理時間 {proposal.processingMs} ms</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-200 p-4">
          <SectionLabel className="mb-2">Customer / Intent</SectionLabel>
          <KeyValue dense items={[
            { label: "顧客", value: <span className="flex flex-wrap items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-400" />{customerName ?? (proposal.customer.isNew ? "新規顧客候補" : proposal.customer.matchedOrganization)} <span className="font-mono text-[11px] text-slate-400">{proposal.customer.maskedName}</span>{proposal.customer.isNew && <Badge tone="info">NEW</Badge>}</span> },
            { label: "依頼分類", value: <span>{proposal.intentLabel} <span className="font-mono text-[11px] text-slate-400">{proposal.intent}</span></span> },
            { label: "要約", value: <span className="text-[13px] leading-relaxed">{proposal.summary}</span> },
          ]} />
        </div>
        <div className="rounded-md border border-brand-200 bg-brand-50/40 p-4">
          <SectionLabel className="mb-2 text-brand-700">Case Proposal（案件候補）</SectionLabel>
          <div className="text-sm font-semibold text-slate-900">{proposalDisplayTitle(proposal, customerName)}</div>
          {proposalDisplayTitle(proposal, customerName) !== proposal.caseProposal.title && <div className="mt-0.5 font-mono text-[10.5px] text-slate-400">AI出力: {proposal.caseProposal.title}</div>}
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">{proposal.caseProposal.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={proposal.caseProposal.priority} />
            <Badge tone={proposal.caseProposal.dueDate ? "neutral" : "danger"}><CalendarDays className="h-3 w-3" /> 期限 {proposal.caseProposal.dueDate ? formatDate(proposal.caseProposal.dueDate) : "未設定"}</Badge>
            <Badge tone="neutral"><User className="h-3 w-3" /> {proposal.caseProposal.assignee}</Badge>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
          <SectionLabel><span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Task Proposals（タスク候補）</span></SectionLabel>
          <span className="text-[11px] text-slate-500">{proposal.taskProposals.length} 件 — 承認後に登録されます</span>
        </div>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] uppercase tracking-wider text-slate-400">
            <tr><th className="px-4 py-1.5 text-left font-medium">#</th><th className="px-4 py-1.5 text-left font-medium">Task</th><th className="px-4 py-1.5 text-left font-medium">Priority</th><th className="px-4 py-1.5 text-left font-medium">Due</th><th className="px-4 py-1.5 text-left font-medium">Assignee</th></tr>
          </thead>
          <tbody>
            {proposal.taskProposals.map((t, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{i + 1}</td>
                <td className="px-4 py-2"><div className="font-medium text-slate-800">{t.title}</div><div className="text-[11px] text-slate-500">{t.description}</div></td>
                <td className="px-4 py-2"><span className={cn("text-[12px]", t.priority === "high" ? "text-red-700" : t.priority === "medium" ? "text-amber-700" : "text-slate-500")}>{PRIORITY_LABEL[t.priority]}</span></td>
                <td className="px-4 py-2 font-mono text-[12px] text-slate-600">{t.dueDate ? formatDate(t.dueDate) : <span className="text-red-600">未設定</span>}</td>
                <td className="px-4 py-2 text-[12px] text-slate-600">{t.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {required.length > 0 && (
        <Notice tone="danger" icon={<AlertCircle className="h-4 w-4 text-red-600" />} title="Missing Information — 不足情報（登録前に必要）">
          <ul className="mt-1 space-y-1">
            {required.map((m) => <li key={m.field}><span className="font-medium">{m.label}:</span> {m.message}</li>)}
          </ul>
        </Notice>
      )}
      {recommended.length > 0 && (
        <Notice tone="warning" icon={<Info className="h-4 w-4 text-amber-600" />} title="確認を推奨する項目">
          <ul className="mt-1 space-y-1">
            {recommended.map((m) => <li key={m.field}><span className="font-medium">{m.label}:</span> {m.message}</li>)}
          </ul>
        </Notice>
      )}
      {proposal.confidence === "low" && (
        <Notice tone="warning" title="確認済みナレッジが不足しています。担当者による確認を推奨します。" />
      )}
    </div>
  );
}
