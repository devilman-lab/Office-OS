import { TrendingUp, Clock, Sparkles, ListChecks, AlertTriangle } from "lucide-react";
import { getEffectivenessMetrics } from "@/services/effectiveness.service";
import { PageHeader, Card, CardHeader, CardBody, Badge, StatCard, Notice, SectionLabel } from "@/components/ui/primitives";
import { formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { prepareDb } from "@/db/snapshot";

export default async function EffectivenessPage() {
  await prepareDb();
  const m = getEffectivenessMetrics();
  const maxTrend = 13;

  return (
    <div>
      <PageHeader eyebrow="Effectiveness Dashboard" title="効果測定" description="導入前後の業務時間削減効果を可視化します。AI の利用回数ではなく、担当者の作業時間がどれだけ減ったかを基準にします。" badges={<Badge tone="danger" mono>DEMO DATA — NOT ACTUAL BUSINESS RESULTS</Badge>} />

      <Notice tone="warning" className="mb-5" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} title="DEMO DATA — NOT ACTUAL BUSINESS RESULTS">
        本画面の数値はデモ用の仮定値（1件あたり手作業 {m.assumptions.manualMinutesPerRequest} 分 → AI支援時 {m.assumptions.aiAssistedMinutesPerRequest} 分、週 {m.assumptions.weeklyRequestsBaseline} 件）に基づく推定です。本番導入時は、導入前に業務ごとの基準値を実測し、導入後の実績と比較します。
      </Notice>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="AI Assisted Requests" value={m.live.aiAssistedRequests} hint={`承認済み ${m.live.proposalsApproved} 件`} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Cases Created (AI)" value={m.live.casesCreatedByAI} hint="AI提案から登録" />
        <StatCard label="Tasks Generated (AI)" value={m.live.tasksGeneratedByAI} hint="承認後に登録されたタスク" icon={<ListChecks className="h-4 w-4" />} />
        <StatCard label="Average Processing Time" value={`${(m.live.averageProcessingMs / 1000).toFixed(1)} 秒`} hint="AI パイプライン（Mock）" icon={<Clock className="h-4 w-4" />} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        <StatCard label="Estimated Manual Time" value={formatMinutes(m.live.estimatedManualMinutes)} hint="手作業で処理した場合" />
        <StatCard label="Estimated Time with AI" value={formatMinutes(m.live.estimatedAssistedMinutes)} hint="確認・承認を含む" />
        <StatCard label="Estimated Time Saved" value={formatMinutes(m.live.estimatedSavedMinutes)} hint="DEMO 推定" tone="success" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Manual Work Reduction" value={`${m.live.manualWorkReductionPct}%`} hint="依頼整理・登録工程" tone="brand" />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
        <Card>
          <CardHeader eyebrow="Before / After" title="週あたりの依頼整理・登録時間" description="DEMO baseline" />
          <CardBody>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Before AI</div><div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{m.weekly.beforeHours}</div><div className="text-[11px] text-slate-500">hours / week</div></div>
              <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">After AI</div><div className="mt-1 text-2xl font-semibold tabular-nums text-brand-900">{m.weekly.afterHours}</div><div className="text-[11px] text-brand-700">hours / week</div></div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-4"><div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Estimated Saved</div><div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-900">{m.weekly.savedHours}</div><div className="text-[11px] text-emerald-700">hours / week（{m.weekly.reductionPct}%）</div></div>
            </div>
            <div className="mt-4 space-y-2">
              <div><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>Before</span><span>{m.weekly.beforeHours} h</span></div><div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-slate-400" style={{ width: "100%" }} /></div></div>
              <div><div className="mb-1 flex justify-between text-[11px] text-slate-500"><span>After</span><span>{m.weekly.afterHours} h</span></div><div className="h-3 rounded bg-slate-100"><div className="h-3 rounded bg-brand-500" style={{ width: `${(m.weekly.afterHours / m.weekly.beforeHours) * 100}%` }} /></div></div>
            </div>
            <div className="mt-4">
              <SectionLabel className="mb-2">Weekly trend（DEMO）</SectionLabel>
              <div className="flex h-28 items-end gap-3">
                {m.trend.map((t) => (
                  <div key={t.week} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end justify-center gap-1">
                      <div className="w-3 rounded-t bg-slate-300" style={{ height: `${(t.before / maxTrend) * 100}%` }} title={`Before ${t.before}h`} />
                      <div className="w-3 rounded-t bg-brand-500" style={{ height: `${(t.after / maxTrend) * 100}%` }} title={`After ${t.after}h`} />
                    </div>
                    <div className="text-[10px] text-slate-500">{t.week}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-slate-300" /> Before</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-brand-500" /> After</span></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Breakdown" title="作業別の所要時間（1件あたり・分）" description="どの工程で時間が減るかを示します。手続きそのもの（届出作成・提出）は AI 化の対象外です。" />
          <CardBody padded={false}>
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-2 text-left font-semibold">Activity</th><th className="px-3 py-2 text-right font-semibold">Before</th><th className="px-3 py-2 text-right font-semibold">After</th><th className="px-3 py-2 text-left font-semibold">Δ</th><th className="px-5 py-2 text-left font-semibold">Note</th></tr></thead>
              <tbody>
                {m.breakdown.map((b) => {
                  const d = b.beforeMin - b.afterMin;
                  return (
                    <tr key={b.activity} className="border-t border-slate-100">
                      <td className="px-5 py-2 text-slate-800">{b.activity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">{b.beforeMin}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-brand-800">{b.afterMin}</td>
                      <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded bg-slate-100"><div className={cn("h-2 rounded", d > 0 ? "bg-emerald-500" : "bg-slate-300")} style={{ width: `${b.beforeMin ? Math.min(100, (d / b.beforeMin) * 100) : 0}%` }} /></div><span className="font-mono text-[11px] text-emerald-700">{d > 0 ? `-${d.toFixed(1)}` : "±0"}</span></div></td>
                      <td className="px-5 py-2 text-[12px] text-slate-500">{b.note}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-5 py-2 text-slate-900">合計（1件あたり）</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{m.assumptions.manualMinutesPerRequest}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-brand-800">{m.assumptions.aiAssistedMinutesPerRequest}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-emerald-700">-{(m.assumptions.manualMinutesPerRequest - m.assumptions.aiAssistedMinutesPerRequest).toFixed(1)} 分（{m.live.manualWorkReductionPct}%）</td>
                  <td className="px-5 py-2 text-[12px] text-slate-500">DEMO 仮定値</td>
                </tr>
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
              測定方法（本番）: 導入前に「依頼受付〜案件登録完了」の所要時間を業務種別ごとに 2〜4 週間サンプリングして基準値を設定し、導入後は監査ログのタイムスタンプ（受信 → 提案 → 承認）から自動集計します。ガバナンス指標として、権限拒否 {m.live.deniedOperations} 件・ナレッジ参照 {m.live.knowledgeReferences} 件も併記します。
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
