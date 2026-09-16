import Link from "next/link";
import { ShieldCheck, Lock, KeyRound, ScrollText, UserCheck, Database, Cloud, ArrowDown, EyeOff, Replace, Split, FileSearch } from "lucide-react";
import { db } from "@/db";
import { auditRepository, permissionRepository, settingsRepository, integrationRepository } from "@/repositories";
import { getAIProvider } from "@/ai";
import { PageHeader, Card, CardHeader, CardBody, Badge, SectionLabel, StatCard } from "@/components/ui/primitives";
import { PermissionBadge } from "@/components/ui/status";
import { ResponsibleAINotice } from "@/components/ui/responsible-ai";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { prepareDb } from "@/db/snapshot";

const PRINCIPLES = [
  { n: 1, en: "Knowledge Source is immutable from AI.", ja: "ナレッジ正本（Obsidian）は AI から変更できません。", icon: Lock },
  { n: 2, en: "AI actions are permission controlled.", ja: "AI の操作はすべて権限表で制御されます（deny by default）。", icon: KeyRound },
  { n: 3, en: "Important actions require human approval.", ja: "案件登録・顧客情報変更・外部送信は担当者の承認が必要です。", icon: UserCheck },
  { n: 4, en: "PII is masked before AI processing whenever possible.", ja: "氏名・会社名・連絡先・住所は AI 処理前にマスキングします。", icon: EyeOff },
  { n: 5, en: "AI outputs are auditable.", ja: "AI の入出力・検証結果・拒否はすべて監査ログに残ります。", icon: ScrollText },
  { n: 6, en: "Knowledge references are traceable.", ja: "どの文書を根拠にしたかを提案・案件から追跡できます。", icon: FileSearch },
  { n: 7, en: "External AI provider can be replaced.", ja: "AI プロバイダは抽象化され、ローカル LLM へ移行できます。", icon: Replace },
  { n: 8, en: "Business data and knowledge data are separated.", ja: "業務データ（Notion）とナレッジ（Obsidian）は分離されています。", icon: Split },
];

export default async function SecurityPage() {
  await prepareDb();
  db();
  const s = settingsRepository.all();
  const ai = getAIProvider();
  const permissions = permissionRepository.list();
  const denied = auditRepository.count({ result: "denied" });
  const lastDenied = auditRepository.list({ result: "denied", limit: 1 })[0];
  const backupOk = integrationRepository.listBackups()[0]?.status === "healthy";
  const knowledgeConnected = s["simulate.knowledge_unavailable"] !== "true";

  const controls = [
    { label: "PII Masking", status: s["security.pii_masking"] === "true" ? "ENABLED" : "DISABLED", ok: s["security.pii_masking"] === "true", desc: "AI 処理前に氏名・組織・電話・メール・住所をトークン化" },
    { label: "Knowledge Write Protection", status: "ENABLED", ok: true, desc: "AI からナレッジ正本への書き込み・削除経路は存在しない" },
    { label: "Permission Enforcement", status: s["security.permission_enforcement"] === "true" ? "ENABLED" : "DISABLED", ok: true, desc: `${permissions.length} アクションを宣言。未定義は拒否` },
    { label: "Audit Logging", status: "ENABLED", ok: true, desc: "AI入出力・権限・承認・DB登録・API・エラーを記録" },
    { label: "Approval Workflow", status: "ENABLED", ok: true, desc: "案件・タスクの登録は担当者の承認で確定" },
    { label: "Backup", status: backupOk ? "HEALTHY" : "ATTENTION", ok: backupOk, desc: "業務DBの日次バックアップ（ナレッジは Vault 側で管理）" },
    { label: "External AI Training", status: "NOT USED IN DEMO", ok: true, desc: `Provider: ${ai.name} — 外部送信なし。本番は学習利用オプトアウト契約が前提` },
    { label: "Knowledge Source Connection", status: knowledgeConnected ? "CONNECTED (SIMULATED)" : "DISCONNECTED", ok: knowledgeConnected, desc: "Obsidian Vault 読み取り専用マウント" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Security Center" title="セキュリティ" description="AI を業務システムに組み込むための統制。ナレッジ不変・権限制御・人間の承認・匿名化・監査を一つの設計として実装しています。" badges={<Badge tone="violet" mono>PROTOTYPE · MOCK CONNECTORS</Badge>} />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Denied AI operations" value={denied} hint={lastDenied ? `最終: ${formatDateTime(lastDenied.timestamp)}` : "拒否なし"} tone="danger" icon={<ShieldCheck className="h-4 w-4" />} href="/audit?result=denied" />
        <StatCard label="Permission checks" value={auditRepository.count({ action: "PERMISSION_CHECK" })} hint="監査済み" href="/audit?action=PERMISSION_CHECK" />
        <StatCard label="Masking operations" value={auditRepository.count({ action: "PII_MASKING" })} hint="PII_MASKING" href="/audit?action=PII_MASKING" />
        <StatCard label="Human approvals" value={auditRepository.count({ action: "HUMAN_APPROVAL" })} hint="HUMAN_APPROVAL" tone="success" href="/audit?action=HUMAN_APPROVAL" />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5">
        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Security Controls" title="統制の状態" />
            <CardBody padded={false}>
              <ul className="divide-y divide-slate-100">
                {controls.map((c) => (
                  <li key={c.label} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={cn("h-2 w-2 rounded-full", c.ok ? "bg-emerald-500" : "bg-red-500")} />
                    <div className="min-w-0 flex-1"><div className="text-[13px] font-medium text-slate-800">{c.label}</div><div className="text-[11px] text-slate-500">{c.desc}</div></div>
                    <Badge tone={c.ok ? (c.status.includes("NOT USED") || c.status.includes("SIMULATED") ? "violet" : "success") : "danger"} mono>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Agent permissions" title="AI エージェント権限表" description="agent_permissions テーブルの内容。変更は管理者のみ。" actions={<Link href="/agent" className="text-xs font-medium text-brand-700 hover:underline">エージェント画面で試す</Link>} />
            <CardBody padded={false}>
              <table className="w-full text-[12px]">
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-1.5 font-mono font-medium text-slate-800">{p.action}</td>
                      <td className="px-3 py-1.5 text-slate-500">{p.description}</td>
                      <td className="px-5 py-1.5 text-right"><PermissionBadge permission={p.permission} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Data Flow" title="データの流れ" description="原本は AI に渡らず、AI の出力は承認を経てのみ業務DBへ。" />
            <CardBody>
              <ol className="space-y-1">
                {[
                  { label: "Input", ja: "Gmail / LINE WORKS / 音声メモ / 電話・面談記録", cls: "bg-slate-100 text-slate-800" },
                  { label: "Masking", ja: "個人情報をトークン化（原本は業務DBに保管）", cls: "bg-emerald-50 text-emerald-900 border-emerald-200" },
                  { label: "AI", ja: "分類・抽出・候補生成（匿名化テキストのみ）", cls: "bg-violet-50 text-violet-900 border-violet-200" },
                  { label: "Knowledge", ja: "Obsidian 確認済みナレッジを読み取り専用で検索", cls: "bg-amber-50 text-amber-900 border-amber-200" },
                  { label: "Proposal", ja: "Zod 検証済みの案件・タスク候補", cls: "bg-brand-50 text-brand-900 border-brand-200" },
                  { label: "Human Approval", ja: "担当者が確認・編集・承認", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
                  { label: "Business DB", ja: "Notion（模擬）に登録 + 監査ログ", cls: "bg-slate-800 text-white" },
                ].map((s, i, arr) => (
                  <li key={s.label}>
                    <div className={cn("flex items-center gap-3 rounded-md border px-3 py-2", s.cls)}>
                      <span className="w-28 shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wide">{s.label}</span>
                      <span className="text-[12px]">{s.ja}</span>
                    </div>
                    {i < arr.length - 1 && <div className="flex justify-center py-0.5"><ArrowDown className="h-3.5 w-3.5 text-slate-300" /></div>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Principles" title="設計原則" />
            <CardBody padded={false}>
              <ul className="divide-y divide-slate-100">
                {PRINCIPLES.map((p) => (
                  <li key={p.n} className="flex items-start gap-3 px-5 py-2.5">
                    <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <div><div className="text-[12.5px] font-medium text-slate-900">{p.n}. {p.en}</div><div className="text-[11.5px] text-slate-500">{p.ja}</div></div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <SectionLabel className="mb-2">Systems of record</SectionLabel>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"><div className="flex items-center gap-1.5 font-semibold text-amber-900"><Lock className="h-3.5 w-3.5" /> Obsidian</div><div className="text-amber-800">Knowledge · READ ONLY · AI WRITE DISABLED</div></div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2"><div className="flex items-center gap-1.5 font-semibold text-slate-900"><Database className="h-3.5 w-3.5" /> Notion（模擬）</div><div className="text-slate-600">Operational data · 承認後に書き込み</div></div>
                <div className="col-span-2 rounded-md border border-slate-200 bg-white px-3 py-2"><div className="flex items-center gap-1.5 font-semibold text-slate-900"><Cloud className="h-3.5 w-3.5" /> AI Provider</div><div className="text-slate-600">{ai.name} · 学習利用: なし · 将来: Local LLM に置換可能</div></div>
              </div>
            </CardBody>
          </Card>
          <ResponsibleAINotice />
        </div>
      </div>
    </div>
  );
}
