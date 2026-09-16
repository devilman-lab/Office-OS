import { PageHeader, Badge } from "@/components/ui/primitives";
import { AssistantChat } from "@/features/assistant/assistant-chat";
import { SUGGESTED_QUESTIONS } from "@/services/assistant.service";
import { isKnowledgeAvailable } from "@/services/integration.service";
import { Notice } from "@/components/ui/primitives";

export default function AssistantPage() {
  const available = isKnowledgeAvailable();
  return (
    <div>
      <PageHeader eyebrow="AI Assistant · Grounded Q&A" title="AI アシスタント" description="事務所の確認済みナレッジ（Obsidian）を検索し、取得した文書の内容だけを根拠に回答案を作成します。参照元・確信度・確認済み文書数を必ず表示します。" badges={<><Badge tone="violet" mono>MOCK AI · OFFLINE</Badge><Badge tone="warning" mono>KNOWLEDGE READ ONLY</Badge></>} />
      {!available && <Notice tone="danger" className="mb-4" title="ナレッジソースが利用できません（シミュレーション中）">AI は根拠なしで回答しません。外部連携ページで Obsidian コネクタを再接続してください。</Notice>}
      <AssistantChat suggestions={SUGGESTED_QUESTIONS} />
    </div>
  );
}
