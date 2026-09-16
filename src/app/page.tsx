import Link from "next/link";
import { Inbox, ClipboardCheck, FolderKanban, CalendarClock, AlertTriangle, Sparkles, ArrowRight, Bot, ShieldAlert, BookOpen, UserCheck, Database, Mail } from "lucide-react";
import { getDashboardMetrics, type ActivityItem } from "@/services/dashboard.service";
import { PageHeader, StatCard, Card, CardHeader, CardBody, Badge, SectionLabel, EmptyState } from "@/components/ui/primitives";
import { LinkButton } from "@/components/ui/button";
import { ConfidenceBadge, PriorityBadge, SourceBadge } from "@/components/ui/status";
import { ResponsibleAINotice } from "@/components/ui/responsible-ai";
import { formatDate, formatMinutes, formatTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const m = getDashboardMetrics();
  const maxPipeline = Math.max(...m.pipeline.map((p) => p.count), 1);

  return (
    <div>
      <PageHeader
        eyebrow="Today's Operations"
        title="ダッシュボード"
        description="受信した依頼が、匿名化 → AI整理 → 担当者確認 → 案件登録までどこまで進んでいるかを一目で把握します。"
        actions={<LinkButton href="/inbox" variant="primary" icon={<Inbox className="h-4 w-4" />}>Inbox を開く</LinkButton>}
      />

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="未処理の依頼" value={m.operations.unprocessedRequests} hint="Unprocessed Requests" tone={m.operations.unprocessedRequests > 0 ? "brand" : "neutral"} icon={<Inbox className="h-4 w-4" />} href="/inbox" />
        <StatCard label="AI提案の確認待ち" value={m.operations.aiReviewRequired} hint="AI Review Required" tone={m.operations.aiReviewRequired > 0 ? "warning" : "neutral"} icon={<ClipboardCheck className="h-4 w-4" />} href="/approvals" />
        <StatCard label="進行中の案件" value={m.operations.activeCases} hint="Active Cases" icon={<FolderKanban className="h-4 w-4" />} href="/cases" />
        <StatCard label="7日以内に期限" value={m.operations.dueSoonTasks} hint="Due Soon" tone={m.operations.dueSoonTasks > 0 ? "warning" : "neutral"} icon={<CalendarClock className="h-4 w-4" />} href="/tasks?view=week" />
        <StatCard label="期限超過タスク" value={m.operations.overdueTasks} hint="Overdue Tasks" tone={m.operations.overdueTasks > 0 ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} href="/tasks?view=overdue" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <Card>
            <CardHeader eyebrow="Request pipeline" title="依頼の処理状況" description="Inbox の受信から案件完了までの流れ。AI は候補を作り、登録は担当者の承認で確定します。" />
            <CardBody>
              <div className="grid grid-cols-6 gap-2">
                {m.pipeline.map((p, i) => (
                  <div key={p.label} className="relative">
                    <div className="flex h-24 items-end rounded-md bg-slate-50 px-2 pb-2">
                      <div className={cn("w-full rounded-sm", i <= 1 ? "bg-amber-300" : i === 2 ? "bg-emerald-400" : "bg-brand-400")} style={{ height: `${Math.max(8, (p.count / maxPipeline) * 100)}%` }} />
                    </div>
                    <div className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{p.count}</div>
                    <div className="text-xs font-medium text-slate-700">{p.label}</div>
                    <div className="text-[11px] text-slate-400">{p.hint}</div>
                    {i < m.pipeline.length - 1 && <ArrowRight className="absolute -right-2.5 top-10 h-3.5 w-3.5 text-slate-300" />}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader eyebrow="Needs attention" title="未処理の依頼" actions={<Link href="/inbox" className="text-xs font-medium text-brand-700 hover:underline">すべて表示</Link>} />
              <CardBody padded={false}>
                {m.attention.pendingInbox.length === 0 ? (
                  <div className="px-5 py-6"><EmptyState icon={<Mail className="h-6 w-6" />} title="未処理の依頼はありません" description="外部連携の同期で新しい依頼を取り込めます。" /></div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {m.attention.pendingInbox.map((i) => (
                      <li key={i.id}>
                        <Link href={`/inbox/${i.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                          <SourceBadge source={i.source} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-800">{i.subject}</span>
                            <span className="block truncate text-[11px] text-slate-500">{i.senderOrganization ?? i.sender} · {relativeTime(i.receivedAt)}</span>
                          </span>
                          <span className="text-xs font-medium text-brand-700">AIで整理</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader eyebrow="Human review" title="AI提案の確認待ち" actions={<Link href="/approvals" className="text-xs font-medium text-brand-700 hover:underline">すべて表示</Link>} />
              <CardBody padded={false}>
                {m.attention.pendingProposals.length === 0 ? (
                  <div className="px-5 py-6"><EmptyState icon={<UserCheck className="h-6 w-6" />} title="確認待ちの提案はありません" /></div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {m.attention.pendingProposals.map((p) => (
                      <li key={p.id}>
                        <Link href={`/approvals/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                          <span className="font-mono text-[11px] text-slate-400">{p.id}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-800">{p.intentLabel}</span>
                            <span className="block text-[11px] text-slate-500">{relativeTime(p.createdAt)}{p.missing > 0 && <span className="ml-2 text-amber-700">不足情報 {p.missing} 件</span>}</span>
                          </span>
                          <ConfidenceBadge confidence={p.confidence as "high" | "medium" | "low"} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader eyebrow="Deadlines" title="期限が近い・超過しているタスク" actions={<Link href="/tasks" className="text-xs font-medium text-brand-700 hover:underline">タスク一覧</Link>} />
            <CardBody padded={false}>
              {[...m.attention.overdue, ...m.attention.dueSoon].length === 0 ? (
                <div className="px-5 py-6"><EmptyState icon={<CalendarClock className="h-6 w-6" />} title="7日以内に期限のタスクはありません" /></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {m.attention.overdue.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                      <Badge tone="danger" mono>OVERDUE</Badge>
                      <Link href={`/cases/${t.caseId}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate text-sm text-slate-800">{t.title}</span>
                        <span className="block truncate text-[11px] text-slate-500">{t.caseTitle}</span>
                      </Link>
                      <span className="text-xs tabular-nums text-red-600">{formatDate(t.dueDate)}</span>
                      <span className="text-xs text-slate-500">{t.assignee}</span>
                    </li>
                  ))}
                  {m.attention.dueSoon.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-2.5">
                      <PriorityBadge priority={t.priority} />
                      <Link href={`/cases/${t.caseId}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate text-sm text-slate-800">{t.title}</span>
                        <span className="block truncate text-[11px] text-slate-500">{t.caseTitle}</span>
                      </Link>
                      <span className="text-xs tabular-nums text-slate-700">{formatDate(t.dueDate)}</span>
                      <span className="text-xs text-slate-500">{t.assignee}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="AI Productivity" title="AI 支援の状況" description="AI は候補を作成し、担当者が承認して登録します。" />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="AI Assisted Requests" value={m.aiProductivity.aiAssistedRequests} />
                <Metric label="Proposals Created" value={m.aiProductivity.proposalsCreated} sub={`承認済み ${m.aiProductivity.proposalsApproved}`} />
                <Metric label="Tasks Generated" value={m.aiProductivity.tasksGenerated} />
                <Metric label="Estimated Time Saved" value={formatMinutes(m.aiProductivity.estimatedTimeSavedMinutes)} sub="DEMO 推定値" />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                <span>権限拒否された AI 操作</span>
                <span className="inline-flex items-center gap-1 font-medium text-red-700"><ShieldAlert className="h-3.5 w-3.5" /> {m.totals.deniedOperations} 件（監査済み）</span>
              </div>
              <Link href="/effectiveness" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">効果測定ダッシュボード <ArrowRight className="h-3 w-3" /></Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Recent Activity" title="最近のアクティビティ" description="監査ログから生成" actions={<Link href="/audit" className="text-xs font-medium text-brand-700 hover:underline">監査ログ</Link>} />
            <CardBody padded={false}>
              <ul className="divide-y divide-slate-100">
                {m.recentActivity.map((a) => (
                  <ActivityRow key={a.id} item={a} />
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <SectionLabel className="mb-2">System of record</SectionLabel>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900"><BookOpen className="h-3.5 w-3.5" /> Obsidian</div>
                  <div className="mt-0.5 text-amber-800">Knowledge · READ ONLY</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800"><Database className="h-3.5 w-3.5" /> Notion（模擬）</div>
                  <div className="mt-0.5 text-slate-600">{m.totals.customers} 顧客 · {m.totals.cases} 案件 · {m.totals.tasks} タスク</div>
                </div>
              </div>
              <div className="mt-3"><ResponsibleAINotice compact /></div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

const KIND_ICON: Record<ActivityItem["kind"], { icon: React.ElementType; cls: string }> = {
  request: { icon: Mail, cls: "bg-sky-50 text-sky-700" },
  ai: { icon: Sparkles, cls: "bg-violet-50 text-violet-700" },
  approval: { icon: UserCheck, cls: "bg-emerald-50 text-emerald-700" },
  registration: { icon: Database, cls: "bg-brand-50 text-brand-700" },
  denied: { icon: ShieldAlert, cls: "bg-red-50 text-red-700" },
  knowledge: { icon: BookOpen, cls: "bg-amber-50 text-amber-700" },
  system: { icon: Bot, cls: "bg-slate-100 text-slate-600" },
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const { icon: Icon, cls } = KIND_ICON[item.kind];
  const body = (
    <>
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded", cls)}><Icon className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-slate-800">{item.title}</span>
        {item.detail && <span className="block truncate text-[11px] text-slate-500">{item.detail}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[11px] text-slate-400">{formatTime(item.timestamp)}</span>
        <span className="block text-[10px] text-slate-400">{item.actor}</span>
      </span>
    </>
  );
  return <li>{item.href ? <Link href={item.href} className="flex items-start gap-2.5 px-5 py-2 hover:bg-slate-50">{body}</Link> : <div className="flex items-start gap-2.5 px-5 py-2">{body}</div>}</li>;
}
