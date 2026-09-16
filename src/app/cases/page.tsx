import Link from "next/link";
import { FolderKanban, Sparkles } from "lucide-react";
import { listCases } from "@/services/case.service";
import { CASE_STATUSES, CASE_STATUS_LABEL, type CaseStatus } from "@/domain/enums";
import { PageHeader, Card, Table, THead, TH, TR, TD, Badge, EmptyState } from "@/components/ui/primitives";
import { CaseStatusBadge, PriorityBadge, SourceBadge } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ status?: string; customer?: string }> }) {
  const { status, customer } = await searchParams;
  const valid = CASE_STATUSES.includes(status as CaseStatus) ? (status as CaseStatus) : undefined;
  const rows = listCases({ status: valid }).filter((c) => !customer || c.customerId === customer);
  const all = listCases();
  const counts = Object.fromEntries(CASE_STATUSES.map((s) => [s, all.filter((c) => c.status === s).length]));

  return (
    <div>
      <PageHeader eyebrow="Case Management" title="案件" description="Notion（業務DB）上の案件。AI提案から承認登録された案件は Source が「AI提案」になります。" badges={<Badge tone="neutral">{all.length} 件</Badge>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/cases" className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", !valid ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>すべて <span className="ml-1 text-slate-400">{all.length}</span></Link>
        {CASE_STATUSES.map((s) => (
          <Link key={s} href={`/cases?status=${s}`} className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", valid === s ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{CASE_STATUS_LABEL[s]} <span className="ml-1 text-slate-400">{counts[s]}</span></Link>
        ))}
      </div>
      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><EmptyState icon={<FolderKanban className="h-6 w-6" />} title="該当する案件はありません" /></div>
        ) : (
          <Table>
            <THead><tr><TH>Case</TH><TH>Customer</TH><TH>Status</TH><TH>Priority</TH><TH>Due Date</TH><TH>Tasks</TH><TH>Assignee</TH><TH>Source</TH></tr></THead>
            <tbody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/cases/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{c.title}</Link>
                    <div className="font-mono text-[11px] text-slate-400">{c.id}</div>
                  </TD>
                  <TD className="text-[13px]">{c.customerName}</TD>
                  <TD><CaseStatusBadge status={c.status} /></TD>
                  <TD><PriorityBadge priority={c.priority} /></TD>
                  <TD className={cn("font-mono text-[12px]", c.overdue ? "text-red-600" : "text-slate-600")}>{formatDate(c.dueDate)}{c.overdue && <span className="ml-1 text-[10px]">OVERDUE</span>}</TD>
                  <TD className="text-[12px] text-slate-600">{c.totalTasks - c.openTasks} / {c.totalTasks}</TD>
                  <TD className="text-[13px]">{c.assignee}</TD>
                  <TD>{c.source === "ai" ? <Badge tone="violet"><Sparkles className="h-3 w-3" /> AI提案</Badge> : <SourceBadge source={c.source} />}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
