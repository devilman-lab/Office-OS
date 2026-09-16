"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, RotateCw, AlertTriangle, Search, ClipboardCheck, BookOpen, ShieldCheck, Cpu } from "lucide-react";
import type { AIProposal, InboxItem } from "@/domain/types";
import { runPipelineAction } from "@/app/actions";
import { PIPELINE_STEPS, type PipelineResult } from "@/services/pipeline.types";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, CardBody, Badge, Notice, SectionLabel, KeyValue } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ConfidenceBadge, SourceBadge } from "@/components/ui/status";
import { ResponsibleAINotice } from "@/components/ui/responsible-ai";
import { useDemoGuide } from "@/features/demo/demo-guide-provider";
import { KnowledgeHitCard } from "@/features/knowledge/knowledge-hit-card";
import { ProposalSummary } from "@/features/proposal/proposal-summary";
import { PipelineStepper, type StepView } from "./pipeline-stepper";
import { MaskingView } from "./masking-view";
import { formatDateTime } from "@/lib/format";

type TabKey = "masking" | "analysis" | "knowledge" | "proposal";
const REVEAL_MS = 420;

export function InboxProcessor({ item, existingProposal, autoRun }: { item: InboxItem; existingProposal: AIProposal | null; autoRun: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const guide = useDemoGuide();
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<PipelineResult | null>(null);
  const [revealed, setRevealed] = React.useState(0);
  const [tab, setTab] = React.useState<TabKey>("masking");
  const autoRunFired = React.useRef(false);

  const canRun = item.aiStatus === "not_processed" || item.aiStatus === "failed";

  const run = React.useCallback(async () => {
    setRunning(true);
    setResult(null);
    setRevealed(0);
    const res = await runPipelineAction(item.id);
    if (!res.ok) {
      setRunning(false);
      toast({ tone: "error", title: "AI処理に失敗しました", description: res.error.message });
      return;
    }
    setResult(res.data);
    // reveal steps one by one so the reviewer can follow what the AI did
    res.data.steps.forEach((_, i) => setTimeout(() => setRevealed(i + 1), REVEAL_MS * (i + 1)));
    setTimeout(() => {
      setRunning(false);
      if (res.data.proposal) {
        guide.setContext({ proposalId: res.data.proposal.id, inboxItemId: item.id });
        toast({ tone: "success", title: "AI提案を作成しました", description: "担当者の確認が必要です。案件・タスクはまだ登録されていません。" });
      } else if (res.data.error) {
        toast({ tone: "error", title: res.data.error.code, description: res.data.error.message });
      }
      router.refresh();
    }, REVEAL_MS * (res.data.steps.length + 1));
  }, [item.id, router, toast, guide]);

  React.useEffect(() => {
    if (autoRun && canRun && !autoRunFired.current) {
      autoRunFired.current = true;
      void run();
    }
  }, [autoRun, canRun, run]);

  const stepViews: StepView[] = PIPELINE_STEPS.map((def, i) => {
    const r = result?.steps[i];
    if (!result) return { def, index: i + 1, state: running && i === 0 ? "running" : "pending" };
    if (i < revealed) return { def, index: i + 1, state: "done", result: r };
    if (i === revealed && running) return { def, index: i + 1, state: "running", result: r };
    return { def, index: i + 1, state: "pending", result: r };
  });
  const allRevealed = !!result && revealed >= result.steps.length;

  // Guided demo: switch tabs according to the current step focus
  React.useEffect(() => {
    if (!guide.active || !allRevealed) return;
    const focus = { 4: "masking", 5: "analysis", 6: "knowledge", 7: "knowledge", 8: "proposal", 9: "proposal", 10: "proposal" }[guide.step] as TabKey | undefined;
    // The guided tour (external navigation state) drives which tab is shown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (focus) setTab(focus);
  }, [guide.active, guide.step, allRevealed]);

  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader eyebrow="Received message" title="受信内容（原本）" description="担当者のみ閲覧可能。AI には匿名化後の文章のみ渡されます。" />
          <CardBody>
            <KeyValue dense items={[
              { label: "Source", value: <SourceBadge source={item.source} /> },
              { label: "受信日時", value: formatDateTime(item.receivedAt) },
              { label: "送信者", value: `${item.senderOrganization ? item.senderOrganization + " / " : ""}${item.sender}` },
            ]} />
            <div className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-[13px] leading-relaxed text-slate-800">{item.content}</div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="AI Processing" title="AI 処理パイプライン" description="各ステップの実行結果は監査ログに記録されます。" actions={result && <Badge tone={result.status === "review_required" ? "warning" : "danger"} mono>{result.status === "review_required" ? "HUMAN REVIEW REQUIRED" : "FAILED"}</Badge>} />
          <CardBody>
            {!result && !running && (
              <div className="mb-4 rounded-md border border-dashed border-brand-300 bg-brand-50/50 px-4 py-4 text-center">
                <Cpu className="mx-auto mb-2 h-6 w-6 text-brand-500" />
                <div className="text-sm font-medium text-slate-800">{canRun ? "この依頼を AI で整理します" : item.aiStatus === "review_required" ? "AI 提案は作成済みです" : item.aiStatus === "registered" ? "この依頼は案件として登録済みです" : "この依頼は却下済みです"}</div>
                <div className="mt-1 text-[12px] text-slate-500">個人情報マスキング → 分類 → ナレッジ検索 → 案件・タスク候補生成 → 検証 → 担当者確認</div>
                <div className="mt-3 flex justify-center gap-2">
                  {canRun && <Button id="run-pipeline" onClick={run} icon={<Sparkles className="h-4 w-4" />} size="lg">AIで整理</Button>}
                  {existingProposal && <LinkButton href={`/approvals/${existingProposal.id}`} variant={existingProposal.status === "pending_review" ? "primary" : "outline"} icon={<ClipboardCheck className="h-4 w-4" />}>{existingProposal.status === "pending_review" ? "提案を確認する" : "提案を表示"}</LinkButton>}
                  {existingProposal?.createdCaseId && <LinkButton href={`/cases/${existingProposal.createdCaseId}`} variant="outline">登録された案件 <ArrowRight className="h-4 w-4" /></LinkButton>}
                </div>
              </div>
            )}
            <PipelineStepper steps={stepViews} />
            {allRevealed && result?.error && (
              <div className="mt-3 space-y-2">
                <Notice tone="danger" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} title={result.error.code}>
                  <div>{result.error.message}</div>
                  {Array.isArray(result.error.details) && (
                    <ul className="mt-1 list-disc pl-4 font-mono text-[11px]">{(result.error.details as { path: string; message: string }[]).map((d, i) => <li key={i}>{d.path || "root"}: {d.message}</li>)}</ul>
                  )}
                  <div className="mt-2 font-medium">次にすること: {result.error.nextAction}</div>
                </Notice>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={run} icon={<RotateCw className="h-4 w-4" />}>AIで整理を再実行</Button>
                  <LinkButton href="/integrations" variant="ghost">外部連携を確認</LinkButton>
                </div>
              </div>
            )}
            {allRevealed && result?.proposal && (
              <div className="mt-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-amber-900">AI generated proposal. Human review required.</div>
                  <div className="text-[12px] text-amber-800">提案 {result.proposal.id} を作成しました。承認されるまで案件・タスクは登録されません。</div>
                </div>
                <LinkButton href={`/approvals/${result.proposal.id}`} variant="primary" icon={<ClipboardCheck className="h-4 w-4" />}>提案を確認する</LinkButton>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader eyebrow="Processing details" title="処理内容の確認" description={result ? `処理時間 ${result.totalMs} ms · Provider: Mock AI (offline)` : "AI処理を実行すると、各段階の結果をここで確認できます。"} />
          <CardBody>
            {!allRevealed ? (
              <div className="space-y-3 py-6 text-center text-[12px] text-slate-400">
                {running ? (
                  <>
                    <div className="mx-auto h-1.5 w-2/3 overflow-hidden rounded bg-slate-100"><div className="h-full animate-pulse-soft bg-brand-400" style={{ width: `${Math.max(10, (revealed / PIPELINE_STEPS.length) * 100)}%` }} /></div>
                    <div>AI が処理中です…（Mock AI はローカルで動作し、外部にデータを送信しません）</div>
                  </>
                ) : (
                  <div>「AIで整理」を実行すると、マスキング結果・分類・参照ナレッジ・提案がここに表示されます。</div>
                )}
              </div>
            ) : (
              <>
                <Tabs<TabKey>
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { value: "masking", label: <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> マスキング</span> },
                    { value: "analysis", label: <span className="inline-flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> 分類・抽出</span> },
                    { value: "knowledge", label: <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> ナレッジ</span>, count: result!.knowledge.length },
                    { value: "proposal", label: <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> 提案</span> },
                  ]}
                  className="mb-4"
                />
                {tab === "masking" && result!.masking && <MaskingView {...result!.masking} />}
                {tab === "analysis" && <AnalysisView result={result!} />}
                {tab === "knowledge" && <KnowledgeView result={result!} />}
                {tab === "proposal" && (result!.proposal ? <ProposalSummary proposal={result!.proposal} customerName={result!.proposal.customer.matchedOrganization} /> : <Notice tone="danger" title="提案は作成されませんでした">{result!.error?.message}</Notice>)}
                <div className="mt-4"><ResponsibleAINotice compact /></div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function AnalysisView({ result }: { result: PipelineResult }) {
  const intent = result.intent;
  const ent = result.entities;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Intent Classification（依頼内容の分類）</SectionLabel>
          {intent && <ConfidenceBadge confidence={intent.confidence} />}
        </div>
        {intent && (
          <>
            <div className="mt-2 text-base font-semibold text-slate-900">{intent.label}</div>
            <div className="mt-1 text-[12px] text-slate-500">{intent.rationale} · score {intent.score}</div>
            {intent.alternatives.length > 0 && (
              <div className="mt-2 text-[11px] text-slate-400">他の候補: {intent.alternatives.map((a) => `${a.label}（${a.score}）`).join(" / ")}</div>
            )}
          </>
        )}
      </div>
      <div className="rounded-md border border-slate-200 p-4">
        <SectionLabel className="mb-2">Entity Extraction（抽出情報）</SectionLabel>
        {ent && (
          <KeyValue dense items={[
            { label: "日付", value: ent.dates.length ? <ul className="space-y-0.5">{ent.dates.map((d) => <li key={d.text} className="text-[13px]"><span className="font-mono">{d.iso}</span> <span className="text-slate-500">「{d.text}」</span> <Badge tone={d.role === "unknown" ? "neutral" : "info"}>{d.role}</Badge></li>)}</ul> : <span className="text-red-600">検出されず — 不足情報として扱います</span> },
            { label: "対象者", value: ent.persons.length ? ent.persons.map((p) => <span key={p} className="mr-1 font-mono text-[12px]">{p}</span>) : "—" },
            { label: "組織", value: ent.organizations.length ? ent.organizations.map((p) => <span key={p} className="mr-1 font-mono text-[12px]">{p}</span>) : "—" },
            { label: "人数", value: ent.headcount ?? "—" },
            { label: "キーワード", value: <div className="flex flex-wrap gap-1">{ent.keywords.map((k) => <span key={k} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{k}</span>)}</div> },
          ]} />
        )}
      </div>
    </div>
  );
}

function KnowledgeView({ result }: { result: PipelineResult }) {
  const verified = result.knowledge.filter((k) => k.verified).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5">
        <Search className="h-4 w-4 text-amber-700" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Search Query</div>
          <div className="truncate text-sm text-slate-800">{result.knowledgeQuery}</div>
        </div>
        <Badge tone="warning" mono>KNOWLEDGE SOURCE · READ ONLY</Badge>
      </div>
      <div className="flex items-center justify-between text-[12px] text-slate-500">
        <span>Retrieved Documents: {result.knowledge.length}</span>
        <span>Verified: {verified} / {result.knowledge.length}</span>
      </div>
      {result.knowledge.length === 0 ? (
        <Notice tone="warning" title="確認済みナレッジから十分な根拠を取得できませんでした。担当者による確認が必要です。" />
      ) : (
        result.knowledge.map((h, i) => <KnowledgeHitCard key={h.documentId} hit={h} index={i + 1} />)
      )}
      <div className="text-[11px] text-slate-400">参照したナレッジは Knowledge Reference として提案・案件に紐付けられ、監査ログから追跡できます。 <Link href="/knowledge" className="text-brand-700 hover:underline">ナレッジブラウザ</Link></div>
    </div>
  );
}
