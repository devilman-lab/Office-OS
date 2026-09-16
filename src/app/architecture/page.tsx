import { Mail, MessageSquare, Mic, ArrowDown, Lock, Database, UserCheck, ScrollText, Cpu, EyeOff, Layers, ArrowRight } from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody, Badge, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { prepareDb } from "@/db/snapshot";

function Box({ title, sub, tone = "neutral", icon, className }: { title: string; sub?: string; tone?: "neutral" | "brand" | "amber" | "violet" | "emerald" | "dark"; icon?: React.ReactNode; className?: string }) {
  const cls = {
    neutral: "border-slate-300 bg-white text-slate-900",
    brand: "border-brand-300 bg-brand-50 text-brand-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    violet: "border-violet-300 bg-violet-50 text-violet-900",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-900",
    dark: "border-slate-800 bg-slate-800 text-white",
  }[tone];
  return (
    <div className={cn("rounded-md border px-4 py-3 text-center shadow-sm", cls, className)}>
      <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold">{icon}{title}</div>
      {sub && <div className={cn("mt-0.5 text-[11px]", tone === "dark" ? "text-slate-300" : "opacity-80")}>{sub}</div>}
    </div>
  );
}
const Down = () => <div className="flex justify-center py-1"><ArrowDown className="h-4 w-4 text-slate-400" /></div>;

const LAYERS = [
  { name: "UI Layer", path: "src/app, src/components, src/features", desc: "Next.js App Router。Server Components + Client Components。" },
  { name: "Application Layer", path: "src/services, src/app/actions", desc: "ユースケース（パイプライン・承認・検索・同期）。Server Actions が入口。" },
  { name: "Domain Layer", path: "src/domain", desc: "エンティティ型・列挙・Zod スキーマ・エラー。" },
  { name: "AI Service Layer", path: "src/ai", desc: "AIProvider 抽象 + Mock / OpenAI(placeholder) 実装。出力は未信頼。" },
  { name: "Knowledge Service Layer", path: "src/knowledge", desc: "KnowledgeProvider 抽象 + Local Markdown 実装。書き込み API なし。" },
  { name: "Security Layer", path: "src/security", desc: "PII マスキング、権限チェック（deny by default）、現在ユーザー。" },
  { name: "Audit Layer", path: "src/audit", desc: "全操作の追記専用ログ。" },
  { name: "Business Data / Repository Layer", path: "src/repositories, src/db", desc: "SQLite（Notion 模擬）。ナレッジ文書は read-only リポジトリ。" },
];

const EVOLUTION = [
  { component: "Email", prototype: "Mock Gmail connector", mvp: "Gmail API（gmail.readonly, ラベル限定）", production: "Gmail API + Pub/Sub push 通知" },
  { component: "Messaging", prototype: "Mock LINE WORKS connector", mvp: "LINE WORKS Bot / Message API", production: "同左 + 監査用アーカイブ" },
  { component: "Voice", prototype: "Mock 文字起こし", mvp: "ローカル Whisper 文字起こし → 匿名化", production: "同左 + 話者分離" },
  { component: "Business DB", prototype: "SQLite（Notion 模擬）", mvp: "Notion API（顧客・案件・タスク・対応履歴 DB）", production: "Notion + 中間DB（PostgreSQL）で監査・集計" },
  { component: "Knowledge", prototype: "Local Markdown 検索（bigram）", mvp: "Obsidian Vault 同期 + Embedding + Vector DB（ハイブリッド検索）", production: "同左 + 再ランキング・メタデータフィルタ" },
  { component: "Files", prototype: "なし", mvp: "Object Storage（顧客資料、暗号化）", production: "同左 + アクセス監査" },
  { component: "LLM", prototype: "Mock AI（ルールベース）", mvp: "LLM Provider（学習オプトアウト契約、JSON出力 + Zod 検証）", production: "Local LLM（Ollama / vLLM）へ切替可能" },
  { component: "Agent runtime", prototype: "権限表 + ツール実行シミュレーション", mvp: "Hermes Agent 等にツール定義・権限表を適用", production: "同左 + 実行サンドボックス" },
  { component: "Auth", prototype: "固定ユーザー", mvp: "Google Workspace SSO", production: "SSO + ロール別権限" },
];

export default async function ArchitecturePage() {
  await prepareDb();
  return (
    <div>
      <PageHeader eyebrow="System Architecture" title="システム構成" description="外部ソース → 入力処理 → 匿名化 → AI/エージェント → ナレッジ（Obsidian）と業務データ（Notion）の分離 → 人間の承認 → 監査。" badges={<Badge tone="violet" mono>PROTOTYPE ARCHITECTURE</Badge>} />

      <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5">
        <Card>
          <CardHeader eyebrow="Diagram" title="全体構成図" />
          <CardBody>
            <SectionLabel className="mb-1 text-center">External Sources</SectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <Box title="Gmail" sub="メール" icon={<Mail className="h-4 w-4" />} />
              <Box title="LINE WORKS" sub="チャット" icon={<MessageSquare className="h-4 w-4" />} />
              <Box title="Voice Memo" sub="音声メモ / 電話 / 面談" icon={<Mic className="h-4 w-4" />} />
            </div>
            <Down />
            <Box title="Input Processing" sub="取り込み・正規化・重複検出（Inbox）" icon={<Layers className="h-4 w-4" />} />
            <Down />
            <Box title="PII Masking" sub="氏名・組織・電話・メール・住所 → トークン" tone="emerald" icon={<EyeOff className="h-4 w-4" />} />
            <Down />
            <Box title="AI / Agent Layer" sub="分類・抽出・候補生成 · 権限制御 · Provider 抽象（Mock → LLM → Local LLM）" tone="violet" icon={<Cpu className="h-4 w-4" />} />
            <div className="grid grid-cols-2 gap-6 py-1">
              <div className="flex justify-center"><ArrowDown className="h-4 w-4 -rotate-45 text-slate-400" /></div>
              <div className="flex justify-center"><ArrowDown className="h-4 w-4 rotate-45 text-slate-400" /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Box title="Knowledge" sub="Obsidian · READ ONLY · AI WRITE DISABLED" tone="amber" icon={<Lock className="h-4 w-4" />} />
                <Down />
                <Box title="Knowledge Search" sub="確認済み文書のみ根拠 · 参照元を記録" tone="amber" />
              </div>
              <div>
                <Box title="Business Data" sub="Notion · 顧客 / 案件 / タスク / 対応履歴" tone="neutral" icon={<Database className="h-4 w-4" />} />
                <Down />
                <Box title="Case / Task Management" sub="AI 提案は承認後にのみ登録" tone="neutral" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 py-1">
              <div className="flex justify-center"><ArrowDown className="h-4 w-4 rotate-45 text-slate-400" /></div>
              <div className="flex justify-center"><ArrowDown className="h-4 w-4 -rotate-45 text-slate-400" /></div>
            </div>
            <Box title="Human Approval" sub="担当者が確認・編集・承認 / 却下" tone="emerald" icon={<UserCheck className="h-4 w-4" />} />
            <Down />
            <Box title="Audit / Monitoring" sub="AI入出力 · ナレッジ参照 · 権限 · 承認 · DB登録 · API · エラー · 効果測定" tone="dark" icon={<ScrollText className="h-4 w-4" />} />
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader eyebrow="Layers" title="レイヤー構成（責務分離）" description="プロトタイプでも本番と同じ層構造で実装しています。" />
            <CardBody padded={false}>
              <ul className="divide-y divide-slate-100">
                {LAYERS.map((l) => (
                  <li key={l.name} className="px-5 py-2.5">
                    <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-slate-900">{l.name}</span><span className="font-mono text-[10.5px] text-slate-400">{l.path}</span></div>
                    <div className="text-[11.5px] text-slate-500">{l.desc}</div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader eyebrow="Provider abstraction" title="差し替え可能なコンポーネント" />
            <CardBody>
              <ul className="space-y-1.5 text-[12px] text-slate-700">
                {[
                  ["AI", "Mock AI → OpenAI / 他 LLM → Local LLM"],
                  ["Knowledge", "Local Markdown → Vector DB → 他検索エンジン"],
                  ["Business DB", "SQLite（Mock Notion）→ Notion API"],
                  ["Email", "Mock Gmail → Gmail API"],
                  ["Messaging", "Mock LINE WORKS → LINE WORKS API"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2"><span className="w-24 shrink-0 font-mono text-[11px] font-semibold text-slate-500">{k}</span><ArrowRight className="h-3 w-3 text-slate-300" /><span>{v}</span></li>
                ))}
              </ul>
              <div className="mt-2 text-[11px] text-slate-400">Mock 実装はビジネスロジックに密結合しておらず、インターフェース（AIProvider / KnowledgeProvider / Connector）越しにのみ利用されます。</div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardHeader eyebrow="Production Evolution" title="Prototype → MVP → Production" description="段階的に Mock を実サービスへ置き換えます。Kubernetes 等の過剰なインフラは不要です。" />
        <CardBody padded={false}>
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-2 text-left font-semibold">Component</th><th className="px-4 py-2 text-left font-semibold">Prototype（現在）</th><th className="px-4 py-2 text-left font-semibold">MVP</th><th className="px-4 py-2 text-left font-semibold">Production</th></tr></thead>
            <tbody>
              {EVOLUTION.map((e) => (
                <tr key={e.component} className="border-t border-slate-100">
                  <td className="px-5 py-2 font-semibold text-slate-800">{e.component}</td>
                  <td className="px-4 py-2 text-violet-800">{e.prototype}</td>
                  <td className="px-4 py-2 text-slate-700">{e.mvp}</td>
                  <td className="px-4 py-2 text-slate-700">{e.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
