import { ShieldCheck } from "lucide-react";

/** Responsible-AI notice shown wherever AI output is displayed. */
export function ResponsibleAINotice({ compact }: { compact?: boolean }) {
  return (
    <div className="flex gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-600">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <div>AIによる回答・提案は、事務所内で確認済みのナレッジを参照して生成されています。</div>
        {!compact && (
          <>
            <div>最終的な判断・顧客への回答・重要な業務処理は担当者が確認してください。</div>
            <div>根拠となるナレッジが不足する場合、AIは推測による回答を行いません。</div>
          </>
        )}
      </div>
    </div>
  );
}
