"use client";

import * as React from "react";
import { ArrowRight, ScrollText } from "lucide-react";
import { Card, CardBody, Badge, KeyValue, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "Input", ja: "入力", desc: "Gmail / LINE WORKS / 音声メモ / 電話・面談記録を Inbox に取り込みます。同一件名・送信者は重複として検出します。", data: "原文（担当者のみ閲覧）", audit: "INBOX_RECEIVED, DUPLICATE_DETECTED", layer: "Integrations / Repository", tone: "neutral" },
  { key: "Normalize", ja: "正規化", desc: "全角半角・日付表記・空白を正規化し、送信者を顧客マスタと照合します。", data: "正規化テキスト", audit: "AI_REQUEST", layer: "Application", tone: "neutral" },
  { key: "Mask", ja: "匿名化", desc: "氏名・組織・電話・メール・住所を [PERSON_001] 等のトークンに置換。原本→トークン対応表はリクエスト内メモリのみで保持します。", data: "匿名化テキスト（AI 入力）", audit: "PII_MASKING", layer: "Security", tone: "emerald" },
  { key: "Classify", ja: "分類", desc: "依頼の種類（資格取得・退職・就業規則・許認可・在留資格 など）を分類し、確信度を付与します。", data: "intent, confidence, rationale", audit: "INTENT_CLASSIFICATION, ENTITY_EXTRACTION", layer: "AI", tone: "violet" },
  { key: "Retrieve", ja: "検索", desc: "分類に応じたクエリで Obsidian の確認済みナレッジを検索し、Relevance と参照元を記録します。未確認文書は根拠に使いません。", data: "KnowledgeHit[]（読み取り専用）", audit: "PERMISSION_CHECK(SEARCH_KNOWLEDGE), KNOWLEDGE_SEARCH", layer: "Knowledge", tone: "amber" },
  { key: "Generate", ja: "生成", desc: "案件候補・タスク候補・期限・担当・不足情報を生成します。法定期限は抽出した日付から逆算します。", data: "raw proposal（未信頼）", audit: "CASE_ANALYSIS, TASK_GENERATION", layer: "AI", tone: "violet" },
  { key: "Validate", ja: "検証", desc: "Zod スキーマで構造を検証し、必須項目（title / priority / dueDate / tasks）を確認します。失敗した出力は保存しません。", data: "validated proposal", audit: "PROPOSAL_VALIDATION / AI_VALIDATION_FAILED", layer: "Application / Domain", tone: "brand" },
  { key: "Human Review", ja: "担当者確認", desc: "担当者が提案を確認・編集・承認または却下します。AI 提案が業務DBに入る唯一の経路です。", data: "AIProposal(status)", audit: "PROPOSAL_CREATED, PROPOSAL_EDITED, HUMAN_APPROVAL / HUMAN_REJECTION", layer: "UI / Application", tone: "emerald" },
  { key: "Persist", ja: "登録", desc: "案件・タスク・対応履歴・参照ナレッジを業務DB（Notion）へ 1 トランザクションで登録します。重複はここでも検出します。", data: "Case, Task, Interaction, KnowledgeReference", audit: "CASE_CREATED, TASK_CREATED, INTERACTION_CREATED, KNOWLEDGE_REFERENCE", layer: "Repository", tone: "neutral" },
  { key: "Audit", ja: "監査", desc: "全ステップの実行者・結果・理由・メタデータを追記専用ログに記録し、効果測定ダッシュボードの元データにもなります。", data: "AuditLog", audit: "（全アクション）", layer: "Audit", tone: "dark" },
] as const;

export function DataFlowExplorer() {
  const [active, setActive] = React.useState(0);
  const s = STEPS[active];
  const toneCls: Record<string, string> = {
    neutral: "border-slate-300 bg-white text-slate-900",
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-900",
    violet: "border-violet-300 bg-violet-50 text-violet-900",
    amber: "border-amber-300 bg-amber-50 text-amber-900",
    brand: "border-brand-300 bg-brand-50 text-brand-900",
    dark: "border-slate-800 bg-slate-800 text-white",
  };
  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
      <Card>
        <CardBody>
          <SectionLabel className="mb-2">クリックして各ステップの説明を表示</SectionLabel>
          <ol className="space-y-1">
            {STEPS.map((st, i) => (
              <li key={st.key}>
                <button onClick={() => setActive(i)} className={cn("flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-all", toneCls[st.tone], active === i ? "ring-2 ring-brand-400 ring-offset-1" : "opacity-80 hover:opacity-100")}>
                  <span className="w-5 font-mono text-[11px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] font-semibold">{st.key}</span>
                  <span className="text-[11px] opacity-80">{st.ja}</span>
                  {active === i && <ArrowRight className="ml-auto h-3.5 w-3.5" />}
                </button>
                {i < STEPS.length - 1 && <div className="flex justify-center text-slate-300"><span className="text-[10px]">↓</span></div>}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
      <Card className="self-start">
        <CardBody>
          <div className="flex items-center gap-2"><span className="font-mono text-[11px] text-slate-400">STEP {String(active + 1).padStart(2, "0")}</span><h3 className="text-base font-semibold text-slate-900">{s.key} <span className="text-sm font-normal text-slate-500">— {s.ja}</span></h3><Badge tone="neutral" className="ml-auto">{s.layer}</Badge></div>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-700">{s.desc}</p>
          <div className="mt-4"><KeyValue dense items={[
            { label: "扱うデータ", value: <span className="font-mono text-[12px]">{s.data}</span> },
            { label: "監査ログ", value: <span className="inline-flex items-start gap-1.5 font-mono text-[11.5px] text-slate-700"><ScrollText className="mt-0.5 h-3.5 w-3.5 text-slate-400" />{s.audit}</span> },
            { label: "レイヤー", value: s.layer },
          ]} /></div>
          {s.key === "Mask" && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[11.5px] text-emerald-900">「山田太郎さんが10月1日に入社予定です。」<br />→「[PERSON_001]さんが10月1日に入社予定です。」</div>}
          {s.key === "Retrieve" && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">Knowledge は READ ONLY。AI から Obsidian への書き込み API は存在せず、WRITE_KNOWLEDGE は権限表で DENIED です。</div>}
          {s.key === "Human Review" && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-900">「AI generated proposal. Human review required.」— 承認・編集・却下はすべて担当者名付きで監査ログに残ります。</div>}
        </CardBody>
      </Card>
    </div>
  );
}
