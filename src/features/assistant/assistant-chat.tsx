"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Search, BookOpen, ShieldCheck, ArrowDown, Sparkles, AlertTriangle, User } from "lucide-react";
import { askAssistantAction } from "@/app/actions";
import type { AssistantAnswer } from "@/services/assistant.service";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Badge, Notice, SectionLabel } from "@/components/ui/primitives";
import { ConfidenceBadge } from "@/components/ui/status";
import { KnowledgeHitCard } from "@/features/knowledge/knowledge-hit-card";
import { cn } from "@/lib/utils";

interface Turn { id: number; question: string; answer: AssistantAnswer | null; phase: "search" | "answer" | "done" }

export function AssistantChat({ suggestions }: { suggestions: string[] }) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);
  const seq = React.useRef(0);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const id = ++seq.current;
    setTurns((t) => [...t, { id, question, answer: null, phase: "search" }]);
    setQ("");
    setBusy(true);
    const res = await askAssistantAction(question);
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "answer" } : x)));
    await new Promise((r) => setTimeout(r, 400));
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "done", answer: res.ok ? res.data : { ...emptyAnswer(question), error: { code: res.error.code, message: res.error.message, nextAction: "もう一度お試しください。" } } } : x)));
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5">
      <Card className="flex min-h-[70vh] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 scroll-thin">
          {turns.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-brand-500" />
              <div className="text-sm font-medium text-slate-800">確認済みナレッジに基づいて回答します</div>
              <div className="mt-1 text-[12px] text-slate-500">質問 → ナレッジ検索 → 参照元 → 根拠付き回答 の流れで表示されます。根拠が見つからない場合、AI は推測で回答しません。</div>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[12px] text-slate-700 hover:border-brand-400 hover:text-brand-800">{s}</button>)}
              </div>
            </div>
          )}
          {turns.map((t) => <TurnView key={t.id} turn={t} />)}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="例: 社会保険の資格取得手続きについて必要な書類を教えてください。" className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" disabled={busy} />
          <Button type="submit" loading={busy} icon={<Send className="h-4 w-4" />}>質問する</Button>
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardBody>
            <SectionLabel className="mb-2">How answers are produced</SectionLabel>
            <ol className="space-y-1.5 text-[12px] text-slate-700">
              {[
                ["Question", "質問（個人情報はマスキング）"],
                ["Knowledge Search", "Obsidian の確認済みナレッジを検索"],
                ["Retrieved Sources", "Relevance / Verified を表示"],
                ["Grounded Answer", "取得した文書の内容のみで回答案を作成"],
              ].map(([en, ja], i) => (
                <li key={en} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 font-mono text-[10px] text-brand-800">{i + 1}</span>
                  <span><span className="font-medium text-slate-900">{en}</span> <span className="text-slate-500">— {ja}</span></span>
                  {i < 3 && <ArrowDown className="ml-auto h-3 w-3 text-slate-300" />}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <SectionLabel className="mb-2">Try these</SectionLabel>
            <div className="space-y-1">
              {suggestions.map((s) => <button key={s} onClick={() => ask(s)} disabled={busy} className="block w-full rounded px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50 hover:text-brand-800">{s}</button>)}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">最後の質問は、ナレッジに根拠がない場合の挙動（推測しない）を確認できます。</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-start gap-2 text-[12px] text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <div>AIによる回答・提案は、事務所内で確認済みのナレッジを参照して生成されています。</div>
                <div>最終的な判断・顧客への回答・重要な業務処理は担当者が確認してください。</div>
                <div>根拠となるナレッジが不足する場合、AIは推測による回答を行いません。</div>
                <div className="mt-1 text-slate-400">Provider: Mock AI（オフライン・学習利用なし）· 質問と回答は監査ログに記録されます。</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function emptyAnswer(question: string): AssistantAnswer {
  return { question, maskedQuestion: question, maskedEntityCount: 0, searchQuery: question, retrieved: [], answer: "", grounded: false, confidence: "low", citedDocumentIds: [], verifiedCount: 0, totalCited: 0, referenceIds: [], error: null, elapsedMs: 0 };
}

function TurnView({ turn }: { turn: Turn }) {
  const a = turn.answer;
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600"><User className="h-4 w-4" /></span>
        <div className="rounded-md bg-slate-100 px-3.5 py-2.5 text-sm text-slate-900">{turn.question}</div>
      </div>

      <div className="ml-10 space-y-3">
        <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-[12px]", turn.phase === "search" ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600")}>
          <Search className={cn("h-3.5 w-3.5", turn.phase === "search" && "animate-pulse-soft")} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Knowledge Search</span>
          <span className="truncate">{a ? `query「${a.searchQuery}」` : "確認済みナレッジを検索中…"}</span>
          {a && <span className="ml-auto shrink-0">{a.retrieved.length} documents · {a.elapsedMs} ms</span>}
          {a && a.maskedEntityCount > 0 && <Badge tone="success" mono>PII MASKED {a.maskedEntityCount}</Badge>}
        </div>

        {a && a.retrieved.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><BookOpen className="h-3.5 w-3.5" /> Retrieved Sources</div>
            <div className="space-y-1.5">{a.retrieved.map((h, i) => <KnowledgeHitCard key={h.documentId} hit={h} index={i + 1} compact />)}</div>
          </div>
        )}

        {turn.phase === "answer" && <div className="flex items-center gap-2 text-[12px] text-slate-500"><Sparkles className="h-3.5 w-3.5 animate-pulse-soft text-brand-500" /> 参照元に基づいて回答を作成中…</div>}

        {a && turn.phase === "done" && (
          a.error ? (
            <Notice tone={a.error.code === "KNOWLEDGE_UNAVAILABLE" ? "danger" : "warning"} icon={<AlertTriangle className="h-4 w-4" />} title={a.error.code === "KNOWLEDGE_UNAVAILABLE" ? "KNOWLEDGE UNAVAILABLE — ナレッジソースに接続できません" : a.error.code}>
              <div>{a.error.message}</div><div className="mt-1 font-medium">次にすること: {a.error.nextAction}</div>
            </Notice>
          ) : (
            <div className={cn("rounded-md border", a.grounded ? "border-emerald-200" : "border-amber-300")}>
              <div className={cn("flex items-center gap-2 border-b px-3.5 py-2", a.grounded ? "border-emerald-100 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                <ShieldCheck className={cn("h-4 w-4", a.grounded ? "text-emerald-700" : "text-amber-700")} />
                <span className={cn("font-mono text-[11px] font-semibold tracking-wide", a.grounded ? "text-emerald-800" : "text-amber-800")}>{a.grounded ? "ANSWER GROUNDED IN VERIFIED KNOWLEDGE" : "INSUFFICIENT GROUNDING — 回答を保留"}</span>
                <span className="ml-auto"><ConfidenceBadge confidence={a.confidence} /></span>
              </div>
              <div className="whitespace-pre-wrap px-4 py-3 text-[13px] leading-relaxed text-slate-800">{a.answer}</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-500">Sources:</span>
                {a.citedDocumentIds.length === 0 ? <span className="text-slate-400">なし</span> : a.citedDocumentIds.map((id) => { const h = a.retrieved.find((r) => r.documentId === id); return <Link key={id} href={`/knowledge?doc=${id}`} className="text-brand-700 hover:underline">{h?.title ?? id}</Link>; })}
                <span className="ml-auto">Verified: {a.verifiedCount} / {a.totalCited} documents</span>
              </div>
              {a.confidence === "low" && <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">確認済みナレッジが不足しています。担当者による確認を推奨します。</div>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
