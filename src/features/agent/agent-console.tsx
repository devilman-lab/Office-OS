"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, ShieldAlert, ShieldCheck, ShieldQuestion, Terminal, AlertTriangle, ScrollText, Bug, PlugZap } from "lucide-react";
import type { AgentTool, AgentToolResult } from "@/services/agent.service";
import { runAgentToolAction, runDemoErrorAction } from "@/app/actions";
import type { AgentAction } from "@/domain/enums";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody, Notice, SectionLabel } from "@/components/ui/primitives";
import { PermissionBadge } from "@/components/ui/status";
import { useToast } from "@/components/ui/toast";
import { KnowledgeHitCard } from "@/features/knowledge/knowledge-hit-card";
import type { SerializableKnowledgeHit } from "@/services/pipeline.types";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";

interface LogLine { id: number; at: string; result: AgentToolResult }

export function AgentConsole({ tools }: { tools: AgentTool[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<LogLine[]>([]);
  const latest = log[0]?.result ?? null;

  const push = (result: AgentToolResult) => setLog((l) => [{ id: Date.now(), at: new Date().toISOString(), result }, ...l].slice(0, 20));

  const run = async (t: AgentTool) => {
    setBusy(t.action);
    const res = await runAgentToolAction(t.action as AgentAction, t.demoInput);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "実行エラー", description: res.error.message });
    push(res.data);
    if (res.data.outcome === "denied") toast({ tone: "error", title: "ACCESS DENIED", description: "AIによる操作は制限されています。監査ログに記録しました。" });
    else if (res.data.outcome === "approval_required") toast({ tone: "warning", title: "APPROVAL REQUIRED", description: "担当者の承認が必要です。" });
    else toast({ tone: "success", title: res.data.title, description: res.data.message });
    router.refresh();
  };

  const runError = async (kind: "INVALID_AI_OUTPUT" | "KNOWLEDGE_UNAVAILABLE") => {
    setBusy(kind);
    const res = await runDemoErrorAction(kind);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "実行エラー", description: res.error.message });
    push(res.data);
    toast({ tone: "warning", title: res.data.title, description: res.data.message });
    router.refresh();
  };

  const groups: { title: string; hint: string; permission: AgentTool["permission"]; icon: React.ReactNode }[] = [
    { title: "ALLOWED — 自動実行可", hint: "読み取りと候補作成のみ。結果は監査ログに残ります。", permission: "allowed", icon: <ShieldCheck className="h-4 w-4 text-emerald-600" /> },
    { title: "APPROVAL REQUIRED — 承認が必要", hint: "AI は提案までで停止し、担当者の承認で確定します。", permission: "approval_required", icon: <ShieldQuestion className="h-4 w-4 text-amber-600" /> },
    { title: "DENIED — 実行不可", hint: "ナレッジ正本の変更や個人情報の出力は AI に許可されません。", permission: "denied", icon: <ShieldAlert className="h-4 w-4 text-red-600" /> },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5">
      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={g.permission}>
            <CardHeader title={<span className="inline-flex items-center gap-2">{g.icon}{g.title}</span>} description={g.hint} />
            <CardBody padded={false}>
              <ul className="divide-y divide-slate-100">
                {tools.filter((t) => t.permission === g.permission).map((t) => (
                  <li key={t.action} id={`tool-${t.action}`} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-[12px] font-semibold text-slate-800">{t.action}</span><span className="text-[12px] text-slate-500">{t.name}</span></div>
                      <div className="text-[11px] text-slate-500">{t.description}</div>
                    </div>
                    <PermissionBadge permission={t.permission} />
                    <Button size="xs" variant={t.permission === "denied" ? "danger" : t.permission === "approval_required" ? "outline" : "outline"} loading={busy === t.action} onClick={() => run(t)} icon={<Play className="h-3 w-3" />}>
                      {t.demoLabel}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Bug className="h-4 w-4 text-slate-500" /> エラーハンドリングのデモ</span>} description="実際のコードパス（Zod 検証 / ナレッジ接続失敗）を通ります。" />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-[13px] font-medium text-slate-800">AI 応答の検証失敗</div>
                <div className="mt-0.5 text-[11px] text-slate-500">title / priority / tasks が欠けた AI 出力を Zod が拒否し、DB に保存しません。</div>
                <Button size="sm" variant="outline" className="mt-2" loading={busy === "INVALID_AI_OUTPUT"} onClick={() => runError("INVALID_AI_OUTPUT")} icon={<AlertTriangle className="h-3.5 w-3.5" />}>不正な AI 出力を検証する</Button>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-[13px] font-medium text-slate-800">ナレッジソース接続失敗</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Obsidian に接続できない状態で検索し、AI が推測回答をしないことを確認します。</div>
                <Button size="sm" variant="outline" className="mt-2" loading={busy === "KNOWLEDGE_UNAVAILABLE"} onClick={() => runError("KNOWLEDGE_UNAVAILABLE")} icon={<PlugZap className="h-3.5 w-3.5" />}>接続失敗をシミュレート</Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="sticky top-20 space-y-4 self-start">
        <Card className={cn(latest?.outcome === "denied" && "border-red-300", latest?.outcome === "approval_required" && "border-amber-300", latest?.outcome === "success" && "border-emerald-300")}>
          <CardHeader eyebrow="Execution result" title="実行結果" description="権限チェック → 実行 or 拒否 → 監査ログ" />
          <CardBody>
            {!latest ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center text-[12px] text-slate-500">
                <Terminal className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                左のツールを実行すると、結果と拒否理由がここに表示されます。<br />おすすめ: <span className="font-mono">WRITE_KNOWLEDGE</span> を試して DENIED を確認してください。
              </div>
            ) : (
              <ResultView r={latest} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Session log" title="このセッションの実行履歴" actions={<Link href="/audit?actorType=ai" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><ScrollText className="h-3.5 w-3.5" /> 監査ログ</Link>} />
          <CardBody padded={false}>
            {log.length === 0 ? <div className="px-5 py-4 text-[12px] text-slate-400">まだ実行されていません。</div> : (
              <ul className="divide-y divide-slate-100">
                {log.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 px-5 py-2 text-[12px]">
                    <span className="font-mono text-[11px] text-slate-400">{formatTime(l.at)}</span>
                    <span className="font-mono text-[11px] text-slate-700">{l.result.action}</span>
                    <span className={cn("ml-auto font-mono text-[10px] font-semibold", l.result.outcome === "denied" ? "text-red-700" : l.result.outcome === "approval_required" ? "text-amber-700" : l.result.outcome === "failed" ? "text-red-700" : "text-emerald-700")}>{l.result.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <SectionLabel className="mb-1">Design note</SectionLabel>
            <div className="text-[12px] leading-relaxed text-slate-600">権限は <span className="font-mono">agent_permissions</span> テーブルで宣言され、未定義のアクションは既定で拒否（deny by default）されます。本番では Hermes Agent 等のツール定義にこの権限表をそのまま適用します。</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ResultView({ r }: { r: AgentToolResult }) {
  const tone = r.outcome === "denied" ? "danger" : r.outcome === "approval_required" ? "warning" : r.outcome === "failed" ? "danger" : "success";
  const Icon = r.outcome === "denied" ? ShieldAlert : r.outcome === "approval_required" ? ShieldQuestion : r.outcome === "failed" ? AlertTriangle : ShieldCheck;
  return (
    <div className="space-y-3">
      <div className={cn("rounded-md border px-4 py-3", tone === "danger" ? "border-red-200 bg-red-50" : tone === "warning" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50")}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-emerald-600")} />
          <span className={cn("font-mono text-sm font-bold tracking-wide", tone === "danger" ? "text-red-800" : tone === "warning" ? "text-amber-800" : "text-emerald-800")}>{r.title}</span>
          <span className="ml-auto font-mono text-[11px] text-slate-500">{r.action}</span>
        </div>
        <div className="mt-1.5 text-[13px] text-slate-800">{r.message}</div>
        {r.reason && <div className="mt-2 rounded bg-white/70 px-3 py-2 text-[12px] text-slate-700"><span className="font-semibold">Reason:</span> {r.reason}</div>}
        {r.nextAction && <div className="mt-2 text-[12px] text-slate-700"><span className="font-semibold">次にすること:</span> {r.nextAction}</div>}
      </div>
      {r.outcome === "denied" && <Notice tone="neutral" icon={<ScrollText className="h-4 w-4 text-slate-500" />} title="監査ログに記録されました">PERMISSION_CHECK（DENIED）と {r.action}（DENIED）の 2 件が記録されています。 <Link href={`/audit?result=denied`} className="text-brand-700 hover:underline">監査ログで確認</Link></Notice>}
      {Array.isArray(r.data) && r.data.length > 0 && typeof r.data[0] === "object" && r.data[0] !== null && "documentId" in (r.data[0] as object) && (
        <div className="space-y-1.5">{(r.data as SerializableKnowledgeHit[]).map((h, i) => <KnowledgeHitCard key={h.documentId} hit={h} index={i + 1} compact />)}</div>
      )}
      {Array.isArray(r.data) && r.data.length > 0 && typeof r.data[0] === "object" && r.data[0] !== null && "path" in (r.data[0] as object) && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700">
          {(r.data as { path: string; message: string }[]).map((d, i) => <div key={i}><span className="text-red-700">{d.path}</span>: {d.message}</div>)}
        </div>
      )}
      {!!r.data && !Array.isArray(r.data) && typeof r.data === "object" ? (
        <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700">{JSON.stringify(r.data, null, 2)}</pre>
      ) : null}
    </div>
  );
}
