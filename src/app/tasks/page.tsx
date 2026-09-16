import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { listTasks } from "@/services/case.service";
import { CURRENT_USER } from "@/security/current-user";
import { PageHeader, Card, Table, THead, TH, TR, TD, Badge, EmptyState } from "@/components/ui/primitives";
import { PriorityBadge, TaskStatusBadge } from "@/components/ui/status";
import { TaskStatusSelect } from "@/features/cases/task-status-select";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "today", label: "Today", ja: "今日" },
  { key: "week", label: "This Week", ja: "今週" },
  { key: "overdue", label: "Overdue", ja: "期限超過" },
  { key: "high", label: "High Priority", ja: "優先度 高" },
  { key: "mine", label: "My Tasks", ja: "自分のタスク" },
  { key: "all", label: "All", ja: "すべて" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const active: ViewKey = VIEWS.some((v) => v.key === view) ? (view as ViewKey) : "today";
  const all = listTasks();
  const open = all.filter((t) => t.status === "todo" || t.status === "in_progress");
  const filters: Record<ViewKey, (t: (typeof all)[number]) => boolean> = {
    today: (t) => t.status !== "done" && t.status !== "cancelled" && t.daysLeft !== null && t.daysLeft <= 0,
    week: (t) => t.status !== "done" && t.status !== "cancelled" && t.daysLeft !== null && t.daysLeft >= 0 && t.daysLeft <= 7,
    overdue: (t) => t.status !== "done" && t.status !== "cancelled" && t.daysLeft !== null && t.daysLeft < 0,
    high: (t) => t.priority === "high" && t.status !== "done" && t.status !== "cancelled",
    mine: (t) => t.assignee === CURRENT_USER.name && t.status !== "done" && t.status !== "cancelled",
    all: () => true,
  };
  const rows = all.filter(filters[active]);
  const counts = Object.fromEntries(VIEWS.map((v) => [v.key, all.filter(filters[v.key]).length]));

  return (
    <div>
      <PageHeader eyebrow="Task Management" title="タスク" description="案件に紐付くタスク。AI が生成したタスクも承認後は通常のタスクとして管理されます。" badges={<Badge tone="neutral">未完了 {open.length} 件</Badge>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/tasks?view=${v.key}`} className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", active === v.key ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            {v.label} <span className="text-slate-400">{v.ja}</span> <span className={cn("ml-1 rounded px-1 text-[10px]", v.key === "overdue" && counts[v.key] > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500")}>{counts[v.key]}</span>
          </Link>
        ))}
      </div>
      <Card>
        {rows.length === 0 ? (
          <div className="p-6"><EmptyState icon={<CheckSquare className="h-6 w-6" />} title="該当するタスクはありません" description={active === "overdue" ? "期限超過のタスクはありません。" : "他のビューを確認してください。"} /></div>
        ) : (
          <Table>
            <THead><tr><TH>Task</TH><TH>Case</TH><TH>Priority</TH><TH>Due</TH><TH>Assignee</TH><TH>Source</TH><TH className="w-36">Status</TH></tr></THead>
            <tbody>
              {rows.map((t) => (
                <TR key={t.id}>
                  <TD><div className="font-medium text-slate-800">{t.title}</div><div className="font-mono text-[10px] text-slate-400">{t.id}</div></TD>
                  <TD><Link href={`/cases/${t.caseId}`} className="text-[13px] text-brand-700 hover:underline">{t.caseTitle}</Link><div className="text-[11px] text-slate-500">{t.customerName}</div></TD>
                  <TD><PriorityBadge priority={t.priority} /></TD>
                  <TD className={cn("font-mono text-[12px]", t.daysLeft !== null && t.daysLeft < 0 && t.status !== "done" ? "text-red-600" : "text-slate-600")}>{formatDate(t.dueDate)}{t.daysLeft !== null && t.status !== "done" && t.status !== "cancelled" && <span className="ml-1 text-[10px] text-slate-400">{t.daysLeft < 0 ? `${-t.daysLeft}日超過` : t.daysLeft === 0 ? "今日" : `あと${t.daysLeft}日`}</span>}</TD>
                  <TD className="text-[13px]">{t.assignee}</TD>
                  <TD>{t.source === "ai" ? <Badge tone="violet">AI</Badge> : <Badge tone="neutral">手動</Badge>}</TD>
                  <TD><TaskStatusSelect id={t.id} status={t.status} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400"><TaskStatusBadge status="todo" /> 未着手 <TaskStatusBadge status="in_progress" /> 対応中 <TaskStatusBadge status="done" /> 完了</div>
    </div>
  );
}
