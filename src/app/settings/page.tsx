import Link from "next/link";
import { Cpu, BookOpen, Database, Plug, ShieldCheck, KeyRound, ScrollText, HardDrive, Server, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { settingsRepository, permissionRepository, integrationRepository, auditRepository, knowledgeRepository } from "@/repositories";
import { getAIProvider } from "@/ai";
import { getKnowledgeProvider } from "@/knowledge";
import { PageHeader, Card, CardHeader, CardBody, Badge, KeyValue, SectionLabel } from "@/components/ui/primitives";
import { PermissionBadge } from "@/components/ui/status";
import { SettingsControls } from "@/features/settings/settings-controls";
import { formatDateTime } from "@/lib/format";

export default function SettingsPage() {
  db();
  const s = settingsRepository.all();
  const ai = getAIProvider();
  const kp = getKnowledgeProvider();
  const integrations = integrationRepository.list();
  const permissions = permissionRepository.list();
  const backups = integrationRepository.listBackups();
  const knowledgeAvailable = s["simulate.knowledge_unavailable"] !== "true";

  return (
    <div>
      <PageHeader eyebrow="Settings" title="設定" description="プロバイダ・連携・セキュリティ・権限・監査・バックアップの構成。プロトタイプでは表示が中心で、変更可能な項目はシミュレーション用です。" badges={<Badge tone="violet" mono>PROTOTYPE</Badge>} />
      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader eyebrow="AI Provider" title={<span className="inline-flex items-center gap-2"><Cpu className="h-4 w-4 text-slate-500" /> AI プロバイダ</span>} description="AIProvider インターフェース経由で差し替え可能。" />
          <CardBody>
            <KeyValue dense items={[
              { label: "Current", value: <span>{ai.name} <Badge tone="violet" mono>{ai.kind}</Badge></span> },
              { label: "入力データの学習利用", value: <Badge tone="success" mono>{ai.trainingOptOut ? "NOT USED" : "CHECK CONTRACT"}</Badge> },
              { label: "AI へ渡すデータ", value: "マスキング済みテキストのみ（原本は渡さない）" },
              { label: "出力の扱い", value: "Zod スキーマ検証 → 担当者の承認 → 業務DB" },
              { label: "環境変数", value: <span className="font-mono text-[11px]">URIZUN_AI_PROVIDER=mock | openai</span> },
            ]} />
          </CardBody>
        </Card>

        <Card className="border-brand-200">
          <CardHeader eyebrow="Future Local LLM" title={<span className="inline-flex items-center gap-2"><Server className="h-4 w-4 text-brand-600" /> ローカル LLM への移行</span>} description="業務データ・ロジックを特定の AI サービスに依存させない設計。" />
          <CardBody>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Current</div><div className="text-sm font-medium text-slate-900">External LLM</div><div className="text-[11px] text-slate-500">（プロトタイプは Mock AI / 本番は API 提供 LLM）</div></div>
              <ArrowRight className="h-5 w-5 text-brand-500" />
              <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5"><div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">Future</div><div className="text-sm font-medium text-brand-900">Local LLM</div><div className="text-[11px] text-brand-700">Ollama / vLLM 等を同一インターフェースで接続</div></div>
            </div>
            <ul className="mt-3 space-y-1 text-[12px] text-slate-600">
              <li>・ 切替は <span className="font-mono">AIProvider</span> の実装追加と環境変数のみ。UI・業務ロジック・監査は変更不要。</li>
              <li>・ プロンプト・出力スキーマ（Zod）はプロバイダ非依存で管理。</li>
              <li>・ ナレッジ検索も <span className="font-mono">KnowledgeProvider</span> でローカル埋め込みモデルに置換可能。</li>
            </ul>
            <SettingsControls futureProvider={s["ai.future_provider"] ?? "local-llm"} knowledgeAvailable={knowledgeAvailable} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Knowledge Source" title={<span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-600" /> ナレッジソース（Obsidian）</span>} />
          <CardBody>
            <KeyValue dense items={[
              { label: "Provider", value: <span>{kp.name} <Badge tone="neutral" mono>{kp.mode}</Badge></span> },
              { label: "Documents", value: `${knowledgeRepository.countDocuments()} 件（確認済みのみ AI 根拠に使用）` },
              { label: "Write access", value: <span className="inline-flex gap-1"><Badge tone="warning" mono>READ ONLY</Badge><Badge tone="danger" mono>AI WRITE DISABLED</Badge></span> },
              { label: "更新方法", value: "担当者が Obsidian で編集 → 所長が確認 → 同期（読み取り専用）" },
              { label: "将来", value: "Embedding + Vector DB によるハイブリッド検索へ移行" },
            ]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Business Database" title={<span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-slate-500" /> 業務DB（Notion）</span>} />
          <CardBody>
            <KeyValue dense items={[
              { label: "Provider", value: <span>SQLite（Notion の模擬） <Badge tone="violet" mono>MOCK</Badge></span> },
              { label: "データ", value: "顧客 / 案件 / タスク / 対応履歴 / AI提案 / ナレッジ参照 / 監査ログ" },
              { label: "書き込み条件", value: "AI 提案は担当者の承認後にのみ登録" },
              { label: "本番", value: "Notion API（Internal Integration）で双方向同期" },
            ]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Integrations" title={<span className="inline-flex items-center gap-2"><Plug className="h-4 w-4 text-slate-500" /> 外部連携</span>} actions={<Link href="/integrations" className="text-xs font-medium text-brand-700 hover:underline">連携画面</Link>} />
          <CardBody padded={false}>
            <ul className="divide-y divide-slate-100">
              {integrations.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-2 text-[12px]"><span className="w-40 font-medium text-slate-800">{i.name}</span><span className="flex-1 truncate text-slate-500">{i.authentication}</span><Badge tone={i.status === "simulated" ? "violet" : "danger"} mono>{i.status === "simulated" ? "SIMULATED" : i.status.toUpperCase()}</Badge></li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Security" title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-500" /> セキュリティ</span>} actions={<Link href="/security" className="text-xs font-medium text-brand-700 hover:underline">Security Center</Link>} />
          <CardBody>
            <KeyValue dense items={[
              { label: "PII Masking", value: <Badge tone="success" mono>ENABLED</Badge> },
              { label: "Permission Enforcement", value: <Badge tone="success" mono>ENABLED · DENY BY DEFAULT</Badge> },
              { label: "Approval Workflow", value: <Badge tone="success" mono>ENABLED</Badge> },
              { label: "認証（本番）", value: "Google Workspace SSO を想定。プロトタイプは固定ユーザー。" },
            ]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Permissions" title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-500" /> エージェント権限</span>} actions={<Link href="/agent" className="text-xs font-medium text-brand-700 hover:underline">試す</Link>} />
          <CardBody padded={false}>
            <ul className="grid grid-cols-2 divide-y divide-slate-100">
              {permissions.map((p) => <li key={p.id} className="flex items-center justify-between px-5 py-1.5 text-[12px]"><span className="font-mono">{p.action}</span><PermissionBadge permission={p.permission} /></li>)}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Audit Logs" title={<span className="inline-flex items-center gap-2"><ScrollText className="h-4 w-4 text-slate-500" /> 監査ログ</span>} actions={<Link href="/audit" className="text-xs font-medium text-brand-700 hover:underline">ログを見る</Link>} />
          <CardBody>
            <KeyValue dense items={[
              { label: "記録件数", value: `${auditRepository.count()} 件` },
              { label: "記録対象", value: "AI入出力 / ナレッジ検索・参照 / 権限チェック / 承認 / DB登録 / API操作 / エラー / 拒否" },
              { label: "保持方針（本番）", value: "改ざん防止のため追記専用。保持期間は事務所規程に従う。" },
            ]} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Backup" title={<span className="inline-flex items-center gap-2"><HardDrive className="h-4 w-4 text-slate-500" /> バックアップ</span>} actions={<Link href="/backup" className="text-xs font-medium text-brand-700 hover:underline">バックアップ画面</Link>} />
          <CardBody>
            <KeyValue dense items={[
              { label: "Last Backup", value: backups[0] ? `${formatDateTime(backups[0].createdAt)}（${backups[0].status}）` : "—" },
              { label: "Restore Points", value: `${backups.length} 件` },
              { label: "対象", value: "業務DB（SQLite → 本番は Notion エクスポート）。ナレッジは Vault の Git/クラウド同期で保全。" },
            ]} />
          </CardBody>
        </Card>
      </div>
      <div className="mt-4 text-[11px] text-slate-400"><SectionLabel>Note</SectionLabel> 設定の変更は監査ログに SETTINGS_CHANGED として記録されます。</div>
    </div>
  );
}
