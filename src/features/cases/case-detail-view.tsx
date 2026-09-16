"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ListChecks, MessagesSquare, ScrollText, Sparkles, Info } from "lucide-react";
import type { CaseDetail } from "@/services/case.service";
import { CASE_STATUSES, CASE_STATUS_LABEL, TASK_STATUSES, TASK_STATUS_LABEL, type CaseStatus, type TaskStatus } from "@/domain/enums";
import { updateCaseStatusAction, updateTaskStatusAction } from "@/app/actions";
import { Card, CardHeader, CardBody, KeyValue, Badge, EmptyState, Table, THead, TH, TR, TD, SectionLabel } from "@/components/ui/primitives";
import { Tabs, Select } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { CaseStatusBadge, PriorityBadge, SourceBadge, ConfidenceBadge, RelevanceBadge, VerifiedBadge, ResultBadge } from "@/components/ui/status";
import { ProposalSummary } from "@/features/proposal/proposal-summary";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { todayDateOnly, daysBetween, cn } from "@/lib/utils";

type Tab = "overview" | "tasks" | "interactions" | "knowledge" | "ai" | "audit";

export function CaseDetailView({ detail, initialTab }: { detail: CaseDetail; initialTab?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = React.useState<Tab>((["overview", "tasks", "interactions", "knowledge", "ai", "audit"].includes(initialTab ?? "") ? initialTab : "overview") as Tab);
  const [busy, setBusy] = React.useState<string | null>(null);
  const today = todayDateOnly();

  const changeCase = async (status: CaseStatus) => {
    setBusy("case");
    const res = await updateCaseStatusAction(detail.case.id, status);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "更新できません", description: res.error.message });
    toast({ tone: "success", title: "案件ステータスを更新しました", description: "監査ログに記録されました。" });
    router.refresh();
  };
  const changeTask = async (id: string, status: TaskStatus) => {
    setBusy(id);
    const res = await updateTaskStatusAction(id, status);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "更新できません", description: res.error.message });
    toast({ tone: "success", title: "タスクを更新しました" });
    router.refresh();
  };

  return (
    <div className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5">
      <div>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          className="mb-4"
          tabs={[
            { value: "overview", label: <span className="inline-flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> 概要</span> },
            { value: "tasks", label: <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> タスク</span>, count: detail.tasks.length },
            { value: "interactions", label: <span className="inline-flex items-center gap-1.5"><MessagesSquare className="h-3.5 w-3.5" /> 対応履歴</span>, count: detail.interactions.length },
            { value: "knowledge", label: <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> 参照ナレッジ</span>, count: detail.references.length },
            { value: "ai", label: <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI履歴</span> },
            { value: "audit", label: <span className="inline-flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> 監査履歴</span>, count: detail.auditLogs.length },
          ]}
        />

        {tab === "overview" && (
          <Card>
            <CardHeader eyebrow="Overview" title="案件概要" />
            <CardBody>
              <KeyValue items={[
                { label: "顧客", value: detail.customer ? <span>{detail.customer.displayName} <span className="text-[11px] text-slate-400">{detail.customer.contactPerson}</span></span> : "—" },
                { label: "説明", value: <span className="whitespace-pre-wrap text-[13px] leading-relaxed">{detail.case.description}</span> },
                { label: "ステータス", value: <CaseStatusBadge status={detail.case.status} /> },
                { label: "優先度", value: <PriorityBadge priority={detail.case.priority} /> },
                { label: "期限", value: <span className={cn("font-mono", detail.case.dueDate && daysBetween(today, detail.case.dueDate) < 0 && !["completed", "archived"].includes(detail.case.status) ? "text-red-600" : "")}>{formatDate(detail.case.dueDate)}</span> },
                { label: "担当", value: detail.case.assignee },
                { label: "登録元", value: detail.case.source === "ai" ? <Badge tone="violet"><Sparkles className="h-3 w-3" /> AI提案 {detail.case.proposalId}</Badge> : <SourceBadge source={detail.case.source} /> },
                { label: "作成", value: formatDateTime(detail.case.createdAt) },
                { label: "更新", value: formatDateTime(detail.case.updatedAt) },
              ]} />
            </CardBody>
          </Card>
        )}

        {tab === "tasks" && (
          <Card>
            <CardHeader eyebrow="Tasks" title="タスク" description="ステータスを変更すると監査ログに記録されます。" />
            <CardBody padded={false}>
              {detail.tasks.length === 0 ? <div className="p-6"><EmptyState title="タスクはありません" /></div> : (
                <Table>
                  <THead><tr><TH>Task</TH><TH>Priority</TH><TH>Due</TH><TH>Assignee</TH><TH>Source</TH><TH className="w-36">Status</TH></tr></THead>
                  <tbody>
                    {detail.tasks.map((t) => {
                      const overdue = t.dueDate && daysBetween(today, t.dueDate) < 0 && (t.status === "todo" || t.status === "in_progress");
                      return (
                        <TR key={t.id}>
                          <TD><div className="font-medium text-slate-800">{t.title}</div><div className="text-[11px] text-slate-500">{t.description}</div><div className="font-mono text-[10px] text-slate-400">{t.id}</div></TD>
                          <TD><PriorityBadge priority={t.priority} /></TD>
                          <TD className={cn("font-mono text-[12px]", overdue ? "text-red-600" : "")}>{formatDate(t.dueDate)}</TD>
                          <TD className="text-[13px]">{t.assignee}</TD>
                          <TD>{t.source === "ai" ? <Badge tone="violet">AI</Badge> : <Badge tone="neutral">手動</Badge>}</TD>
                          <TD>
                            <Select value={t.status} disabled={busy === t.id} onChange={(e) => changeTask(t.id, e.target.value as TaskStatus)} className="h-8 py-0 text-xs">
                              {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
                            </Select>
                          </TD>
                        </TR>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "interactions" && (
          <Card>
            <CardHeader eyebrow="Interactions" title="対応履歴" description="原本は担当者のみ。AI には匿名化版のみ渡されます。" />
            <CardBody padded={false}>
              {detail.interactions.length === 0 ? <div className="p-6"><EmptyState title="対応履歴はありません" /></div> : (
                <ul className="divide-y divide-slate-100">
                  {detail.interactions.map((i) => (
                    <li key={i.id} className="px-5 py-3">
                      <div className="flex items-center gap-2"><SourceBadge source={i.source} /><span className="text-sm font-medium text-slate-900">{i.subject}</span><span className="font-mono text-[11px] text-slate-400">{i.id}</span><span className="ml-auto text-[11px] text-slate-400">{formatDateTime(i.createdAt)}</span></div>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div><SectionLabel className="mb-1">原本</SectionLabel><div className="whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-700">{i.content}</div></div>
                        <div><SectionLabel className="mb-1 text-emerald-700">匿名化版（AI入力）</SectionLabel><div className="whitespace-pre-wrap rounded bg-emerald-50/60 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-slate-700">{i.maskedContent}</div></div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "knowledge" && (
          <Card>
            <CardHeader eyebrow="Knowledge References" title="参照ナレッジ" description="この案件の AI 提案が根拠にした Obsidian の文書。追跡可能です。" />
            <CardBody padded={false}>
              {detail.references.length === 0 ? <div className="p-6"><EmptyState title="参照ナレッジはありません" description="手動登録の案件、または根拠なしで登録された案件です。" /></div> : (
                <ul className="divide-y divide-slate-100">
                  {detail.references.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                      <BookOpen className="mt-0.5 h-4 w-4 text-amber-600" />
                      <div className="flex-1">
                        <Link href={`/knowledge?doc=${r.knowledgeDocumentId}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.document?.title ?? r.knowledgeDocumentId}</Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">{r.document && <VerifiedBadge verified={r.document.verified} />}<RelevanceBadge relevance={r.relevance} /><span className="font-mono text-[11px] text-slate-400">score {r.score.toFixed(2)}</span><span className="font-mono text-[11px] text-slate-400">{r.id}</span></div>
                        <div className="mt-1 text-[11px] text-slate-400">query「{r.query}」· used by {r.usedBy} · {formatDateTime(r.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {tab === "ai" && (
          <Card>
            <CardHeader eyebrow="AI History" title="AI 提案の履歴" actions={detail.proposal && <ConfidenceBadge confidence={detail.proposal.confidence} />} />
            <CardBody>
              {detail.proposal ? (
                <>
                  <div className="mb-3 flex items-center gap-2 text-[12px] text-slate-500"><Link href={`/approvals/${detail.proposal.id}`} className="font-mono text-brand-700 hover:underline">{detail.proposal.id}</Link>· {detail.proposal.reviewedBy} が {formatDateTime(detail.proposal.reviewedAt)} に {detail.proposal.status === "approved" ? "承認" : detail.proposal.status}{detail.proposal.reviewNote && <span>· メモ: {detail.proposal.reviewNote}</span>}</div>
                  <ProposalSummary proposal={detail.proposal} customerName={detail.customer?.displayName} showHeader={false} />
                </>
              ) : <EmptyState icon={<Sparkles className="h-6 w-6" />} title="この案件は手動で登録されました" description="AI 提案は関与していません。" />}
            </CardBody>
          </Card>
        )}

        {tab === "audit" && (
          <Card>
            <CardHeader eyebrow="Audit History" title="監査履歴" description="この案件・タスク・提案に関する操作記録。" />
            <CardBody padded={false}>
              {detail.auditLogs.length === 0 ? <div className="p-6"><EmptyState title="監査記録はありません" /></div> : (
                <Table>
                  <THead><tr><TH>Time</TH><TH>Actor</TH><TH>Action</TH><TH>Resource</TH><TH>Result</TH><TH>Reason</TH></tr></THead>
                  <tbody>
                    {detail.auditLogs.map((l) => (
                      <TR key={l.id}>
                        <TD className="font-mono text-[11px] text-slate-500">{formatDateTime(l.timestamp)} {formatTime(l.timestamp).slice(-2)}</TD>
                        <TD className="text-[12px]">{l.actor}</TD>
                        <TD className="font-mono text-[11px]">{l.action}</TD>
                        <TD className="font-mono text-[11px] text-slate-500">{l.resourceId}</TD>
                        <TD><ResultBadge result={l.result} /></TD>
                        <TD className="text-[12px] text-slate-600">{l.reason}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader eyebrow="Status" title="案件ステータス" />
          <CardBody>
            <Select value={detail.case.status} disabled={busy === "case"} onChange={(e) => changeCase(e.target.value as CaseStatus)}>
              {CASE_STATUSES.map((s) => <option key={s} value={s}>{CASE_STATUS_LABEL[s]}</option>)}
            </Select>
            <div className="mt-2 text-[11px] text-slate-400">新規 → 確認中 → 対応中 → 待ち → 完了 → アーカイブ</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader eyebrow="Summary" title="サマリー" />
          <CardBody>
            <KeyValue dense items={[
              { label: "タスク", value: `${detail.tasks.filter((t) => t.status === "done").length} / ${detail.tasks.length} 完了` },
              { label: "対応履歴", value: `${detail.interactions.length} 件` },
              { label: "参照ナレッジ", value: `${detail.references.length} 件` },
              { label: "AI提案", value: detail.proposal ? <Link href={`/approvals/${detail.proposal.id}`} className="font-mono text-brand-700 hover:underline">{detail.proposal.id}</Link> : "なし" },
              { label: "監査記録", value: `${detail.auditLogs.length} 件` },
            ]} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <SectionLabel className="mb-1">Business DB</SectionLabel>
            <div className="text-[12px] leading-relaxed text-slate-600">この画面のデータは Notion（業務DB）に相当します。プロトタイプでは SQLite が代替しています。ナレッジ（Obsidian）とは分離されており、AI はナレッジを書き換えられません。</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
