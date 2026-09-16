"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Pencil, ArrowRight, AlertTriangle, CalendarPlus, BookOpen, Mail, Copy } from "lucide-react";
import type { ProposalReview } from "@/services/approval.service";
import type { ApprovalResult } from "@/services/approval.service";
import { approveProposalAction, editProposalAction, rejectProposalAction } from "@/app/actions";
import { PRIORITIES, PRIORITY_LABEL } from "@/domain/enums";
import { STAFF } from "@/security/current-user";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, CardBody, Notice, Badge, SectionLabel, KeyValue } from "@/components/ui/primitives";
import { Dialog, Field, Input, Select, Textarea } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { RelevanceBadge, VerifiedBadge, SourceBadge } from "@/components/ui/status";
import { ResponsibleAINotice } from "@/components/ui/responsible-ai";
import { useDemoGuide } from "@/features/demo/demo-guide-provider";
import { ProposalSummary } from "./proposal-summary";
import { formatDate, formatDateTime } from "@/lib/format";
import type { TaskProposal } from "@/domain/types";

export function ProposalReviewPanel({ review }: { review: ProposalReview }) {
  const router = useRouter();
  const toast = useToast();
  const guide = useDemoGuide();
  const { proposal } = review;
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSession, setEditSession] = React.useState(0);
  const openEdit = () => { setEditSession((n) => n + 1); setEditOpen(true); };
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [dupOpen, setDupOpen] = React.useState<{ message: string; existingId: string } | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null);
  const [done, setDone] = React.useState<ApprovalResult | null>(null);

  const approve = async (allowDuplicate = false) => {
    setBusy("approve");
    const res = await approveProposalAction(proposal.id, { reviewNote: note || undefined, allowDuplicate });
    setBusy(null);
    if (!res.ok) {
      if (res.error.code === "DUPLICATE_DETECTED") {
        setDupOpen({ message: res.error.message, existingId: (res.error.details as { existingId: string })?.existingId });
        return;
      }
      toast({ tone: "error", title: "登録できません", description: res.error.message });
      return;
    }
    setDupOpen(null);
    setDone(res.data);
    guide.setContext({ caseId: res.data.case.id, proposalId: proposal.id });
    toast({ tone: "success", title: "案件を登録しました", description: `${res.data.case.id} / タスク ${res.data.tasks.length} 件 / 対応履歴・参照ナレッジ・監査ログを記録` });
    router.refresh();
  };

  const reject = async (reason: string) => {
    setBusy("reject");
    const res = await rejectProposalAction(proposal.id, reason);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "却下できません", description: res.error.message });
    setRejectOpen(false);
    toast({ tone: "info", title: "提案を却下しました", description: "監査ログに記録されました。" });
    router.refresh();
  };

  const pending = proposal.status === "pending_review" && !done;

  return (
    <div className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5">
      <div className="space-y-5">
        {done && (
          <Card className="border-emerald-300">
            <CardBody>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                <div className="flex-1">
                  <div className="text-base font-semibold text-emerald-900">承認して登録しました</div>
                  <div className="mt-1 text-[13px] text-slate-600">案件 <span className="font-mono">{done.case.id}</span>、タスク {done.tasks.length} 件、対応履歴の紐付け、参照ナレッジ、監査ログが業務DBに記録されました。{done.customerCreated && " 新規顧客も登録されました。"}</div>
                  <div className="mt-3 flex gap-2">
                    <LinkButton href={`/cases/${done.case.id}`} variant="primary">登録された案件を開く <ArrowRight className="h-4 w-4" /></LinkButton>
                    <LinkButton href="/audit" variant="outline">監査ログを見る</LinkButton>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {pending && review.blockingIssues.length > 0 && (
          <Notice tone="danger" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} title="Missing Information — 登録前に必要な項目があります">
            <ul className="mt-1 list-disc pl-4">{review.blockingIssues.map((b) => <li key={b}>{b}</li>)}</ul>
            <div className="mt-2"><Button size="sm" variant="outline" onClick={openEdit} icon={<CalendarPlus className="h-4 w-4" />}>期限を追加する（Add Due Date）</Button></div>
          </Notice>
        )}

        <Card>
          <CardHeader eyebrow="Proposal" title="AI 提案の内容" description="AI generated proposal. Human review required." actions={pending && <Button size="sm" variant="outline" onClick={openEdit} icon={<Pencil className="h-3.5 w-3.5" />}>編集</Button>} />
          <CardBody>
            <ProposalSummary proposal={proposal} customerName={review.customer?.displayName} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Source" title="元の依頼（対応履歴として記録済み）" />
          <CardBody>
            {review.interaction ? (
              <>
                <div className="mb-2 flex items-center gap-2"><SourceBadge source={review.interaction.source} /><span className="text-sm font-medium">{review.interaction.subject}</span><span className="font-mono text-[11px] text-slate-400">{review.interaction.id}</span><span className="text-[11px] text-slate-400">{formatDateTime(review.interaction.createdAt)}</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><SectionLabel className="mb-1">原本</SectionLabel><div className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-700">{review.interaction.content}</div></div>
                  <div><SectionLabel className="mb-1 text-emerald-700">AI に渡した匿名化版</SectionLabel><div className="whitespace-pre-wrap rounded-md bg-emerald-50/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-slate-700">{review.interaction.maskedContent}</div></div>
                </div>
              </>
            ) : <div className="text-sm text-slate-500">対応履歴が見つかりません。</div>}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className={pending ? "border-brand-300" : ""}>
          <CardHeader eyebrow="Decision" title="担当者の判断" />
          <CardBody>
            {pending ? (
              <>
                <Notice tone="warning" className="mb-3" title="AI generated proposal. Human review required.">承認すると案件・タスク・対応履歴・参照ナレッジが業務DBに登録され、監査ログに記録されます。</Notice>
                <Field label="確認メモ（任意）"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例: 入社日を顧客に再確認済み" className="min-h-[64px]" /></Field>
                <div className="mt-3 grid gap-2">
                  <Button id="approve" variant="success" size="lg" loading={busy === "approve"} disabled={!review.canApprove} onClick={() => approve(false)} icon={<CheckCircle2 className="h-4 w-4" />}>承認して登録（Approve &amp; Register）</Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={openEdit} icon={<Pencil className="h-4 w-4" />}>編集</Button>
                    <Button variant="danger" loading={busy === "reject"} onClick={() => setRejectOpen(true)} icon={<XCircle className="h-4 w-4" />}>却下</Button>
                  </div>
                </div>
                {!review.canApprove && <div className="mt-2 text-[11px] text-red-600">不足情報を補うまで登録できません。</div>}
              </>
            ) : (
              <KeyValue dense items={[
                { label: "結果", value: <Badge tone={proposal.status === "approved" ? "success" : "neutral"} mono>{proposal.status.toUpperCase()}</Badge> },
                { label: "処理者", value: proposal.reviewedBy ?? "—" },
                { label: "処理日時", value: formatDateTime(proposal.reviewedAt) },
                { label: "メモ", value: proposal.reviewNote ?? "—" },
                ...(proposal.createdCaseId ? [{ label: "案件", value: <Link href={`/cases/${proposal.createdCaseId}`} className="font-mono text-brand-700 hover:underline">{proposal.createdCaseId}</Link> }] : []),
              ]} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Related Knowledge" title="参照ナレッジ" description="提案の根拠。Obsidian の確認済み文書のみ。" />
          <CardBody padded={false}>
            {review.references.length === 0 ? (
              <div className="px-5 py-4 text-[12px] text-slate-500">参照ナレッジなし — 担当者が根拠を確認してください。</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {review.references.map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/knowledge?doc=${r.knowledgeDocumentId}`} className="text-[13px] font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.document?.title ?? r.knowledgeDocumentId}</Link>
                        <div className="mt-1 flex flex-wrap gap-1.5">{r.document && <VerifiedBadge verified={r.document.verified} />}<RelevanceBadge relevance={r.relevance} /><span className="font-mono text-[11px] text-slate-400">{r.id}</span></div>
                        <div className="mt-1 text-[11px] text-slate-400">Updated {r.document ? formatDate(r.document.updatedAt) : "—"} · query「{r.query}」</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Context" title="受信情報" />
          <CardBody>
            <KeyValue dense items={[
              { label: "Inbox", value: review.inboxItem ? <Link href={`/inbox/${review.inboxItem.id}`} className="inline-flex items-center gap-1 font-mono text-brand-700 hover:underline"><Mail className="h-3 w-3" />{review.inboxItem.id}</Link> : "—" },
              { label: "顧客", value: review.customer ? review.customer.displayName : <span className="text-slate-500">新規顧客候補（承認時に登録）</span> },
              { label: "作成日時", value: formatDateTime(proposal.createdAt) },
            ]} />
          </CardBody>
        </Card>
        <ResponsibleAINotice />
      </div>

      <EditDialog key={editSession} open={editOpen} onClose={() => setEditOpen(false)} review={review} onSaved={() => { setEditOpen(false); router.refresh(); }} />

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="提案を却下しますか？" description="却下理由は監査ログに記録されます。案件・タスクは登録されません。" size="sm" footer={<><Button variant="outline" onClick={() => setRejectOpen(false)}>キャンセル</Button><RejectButton onConfirm={reject} loading={busy === "reject"} /></>}>
        <RejectReason />
      </Dialog>

      <Dialog open={!!dupOpen} onClose={() => setDupOpen(null)} title="DUPLICATE DETECTED — 重複の可能性" description="同一顧客・同一タイトルの未完了案件が既に存在します。" size="sm" footer={<><Button variant="outline" onClick={() => setDupOpen(null)}>キャンセル</Button><Button variant="secondary" loading={busy === "approve"} onClick={() => approve(true)} icon={<Copy className="h-4 w-4" />}>別案件として登録する</Button></>}>
        <Notice tone="warning" title={dupOpen?.message}>
          既存の案件を確認するか、意図的に別案件として登録してください。判断は監査ログに記録されます。
          {dupOpen?.existingId && <div className="mt-2"><Link href={`/cases/${dupOpen.existingId}`} className="text-brand-700 hover:underline">既存案件 {dupOpen.existingId} を開く</Link></div>}
        </Notice>
      </Dialog>
    </div>
  );
}

let rejectReasonValue = "";
function RejectReason() {
  const [v, setV] = React.useState("");
  return <Field label="却下理由"><Textarea value={v} onChange={(e) => { setV(e.target.value); rejectReasonValue = e.target.value; }} placeholder="例: 営業メールのため案件化不要" /></Field>;
}
function RejectButton({ onConfirm, loading }: { onConfirm: (reason: string) => void; loading: boolean }) {
  return <Button variant="danger" loading={loading} onClick={() => onConfirm(rejectReasonValue)}>却下する</Button>;
}

function EditDialog({ open, onClose, review, onSaved }: { open: boolean; onClose: () => void; review: ProposalReview; onSaved: () => void }) {
  const toast = useToast();
  const p = review.proposal;
  const [form, setForm] = React.useState({ title: p.caseProposal.title, description: p.caseProposal.description, priority: p.caseProposal.priority, dueDate: p.caseProposal.dueDate ?? "", assignee: p.caseProposal.assignee, summary: p.summary });
  const [tasks, setTasks] = React.useState<TaskProposal[]>(p.taskProposals);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await editProposalAction(p.id, {
      summary: form.summary,
      caseProposal: { title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate || null, assignee: form.assignee },
      taskProposals: tasks,
    });
    setSaving(false);
    if (!res.ok) {
      const details = res.error.details as { path: string; message: string }[] | undefined;
      setError(details?.map((d) => `${d.path}: ${d.message}`).join(" / ") ?? res.error.message);
      return;
    }
    toast({ tone: "success", title: "提案を更新しました", description: "編集内容は再検証され、監査ログに記録されました。" });
    onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} title="提案を編集" description="編集内容は Zod で再検証されます。期限（YYYY-MM-DD）は登録に必須です。" size="lg" footer={<><Button variant="outline" onClick={onClose}>キャンセル</Button><Button loading={saving} onClick={save}>保存</Button></>}>
      {error && <Notice tone="danger" className="mb-3" title="入力内容に誤りがあります">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="案件名"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field></div>
        <Field label="優先度"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}>{PRIORITIES.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABEL[pr]}</option>)}</Select></Field>
        <Field label="期限（必須）" error={!form.dueDate ? "期限を入力してください" : null}><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
        <Field label="担当"><Select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>{STAFF.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <div className="col-span-2"><Field label="要約"><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field></div>
        <div className="col-span-2"><Field label="案件の説明"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
      </div>
      <SectionLabel className="mt-4 mb-2">タスク候補</SectionLabel>
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_9rem_7rem_auto] items-center gap-2 rounded-md border border-slate-200 p-2">
            <Input value={t.title} onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <Select value={t.priority} onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? { ...x, priority: e.target.value as TaskProposal["priority"] } : x)))}>{PRIORITIES.map((pr) => <option key={pr} value={pr}>{PRIORITY_LABEL[pr]}</option>)}</Select>
            <Input type="date" value={t.dueDate ?? ""} onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? { ...x, dueDate: e.target.value || null } : x)))} />
            <Select value={t.assignee} onChange={(e) => setTasks(tasks.map((x, j) => (j === i ? { ...x, assignee: e.target.value } : x)))}>{STAFF.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
            <Button size="xs" variant="ghost" onClick={() => setTasks(tasks.filter((_, j) => j !== i))} disabled={tasks.length <= 1}>削除</Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setTasks([...tasks, { title: "新しいタスク", description: "", priority: "medium", dueDate: form.dueDate || null, assignee: form.assignee }])}>タスクを追加</Button>
      </div>
    </Dialog>
  );
}
