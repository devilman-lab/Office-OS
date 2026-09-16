"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setKnowledgeAvailabilityAction, setSettingAction } from "@/app/actions";
import { Select, Field } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SettingsControls({ futureProvider, knowledgeAvailable }: { futureProvider: string; knowledgeAvailable: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
      <Field label="移行先プロバイダ（計画）" hint="設定値のみ。実際の接続は本番フェーズ。">
        <Select defaultValue={futureProvider} onChange={async (e) => { const r = await setSettingAction("ai.future_provider", e.target.value); if (r.ok) { toast({ tone: "success", title: "設定を保存しました" }); router.refresh(); } }}>
          <option value="local-llm">Local LLM（Ollama / vLLM）</option>
          <option value="openai">OpenAI（学習オプトアウト契約）</option>
          <option value="azure-openai">Azure OpenAI（国内リージョン）</option>
          <option value="anthropic">Anthropic（学習オプトアウト）</option>
        </Select>
      </Field>
      <Field label="ナレッジソース接続（シミュレーション）" hint="切断すると AI は根拠なしで回答しません。">
        <Button variant={knowledgeAvailable ? "danger" : "success"} loading={busy} onClick={async () => { setBusy(true); const r = await setKnowledgeAvailabilityAction(!knowledgeAvailable); setBusy(false); if (r.ok) { toast({ tone: knowledgeAvailable ? "warning" : "success", title: knowledgeAvailable ? "ナレッジソースを切断しました（シミュレーション）" : "ナレッジソースを再接続しました" }); router.refresh(); } }}>
          {knowledgeAvailable ? "Obsidian 接続を切断する" : "Obsidian 接続を復旧する"}
        </Button>
      </Field>
    </div>
  );
}
