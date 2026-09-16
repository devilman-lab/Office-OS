import Link from "next/link";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { db } from "@/db";
import { inboxRepository } from "@/repositories";
import { PageHeader, Card, Table, THead, TH, TR, TD, Badge, EmptyState } from "@/components/ui/primitives";
import { InboxStatusBadge, SourceBadge } from "@/components/ui/status";
import { LinkButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-class";
import { formatDateTime } from "@/lib/format";
import { truncate } from "@/lib/utils";

export default function InboxPage() {
  db();
  const items = inboxRepository.list();
  const unprocessed = items.filter((i) => i.aiStatus === "not_processed" || i.aiStatus === "failed").length;

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="受信トレイ"
        description="Gmail・LINE WORKS・音声メモ・電話メモ・面談記録から取り込まれた依頼。「AIで整理」を押すと、匿名化 → 分類 → ナレッジ検索 → 案件・タスク候補の生成が実行され、担当者の確認待ちになります。"
        badges={<Badge tone="violet" mono>MOCK CONNECTORS</Badge>}
        actions={
          <>
            <LinkButton href="/integrations" variant="outline" icon={<RefreshCw className="h-4 w-4" />}>外部連携を同期</LinkButton>
            <Badge tone={unprocessed > 0 ? "brand" : "neutral"}>未処理 {unprocessed} 件</Badge>
          </>
        }
      />
      <Card>
        {items.length === 0 ? (
          <div className="p-6"><EmptyState title="受信した依頼はありません" description="外部連携ページで同期を実行すると、模擬データが取り込まれます。" /></div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH className="w-32">Source</TH>
                <TH className="w-36">Received</TH>
                <TH className="w-44">Sender</TH>
                <TH>Subject / Preview</TH>
                <TH className="w-36">AI Status</TH>
                <TH className="w-40 text-right"></TH>
              </tr>
            </THead>
            <tbody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD><SourceBadge source={item.source} /></TD>
                  <TD className="font-mono text-[12px] text-slate-500">{formatDateTime(item.receivedAt)}</TD>
                  <TD>
                    <div className="text-sm text-slate-800">{item.senderOrganization ?? "—"}</div>
                    <div className="text-[11px] text-slate-500">{item.sender}</div>
                  </TD>
                  <TD>
                    <Link href={`/inbox/${item.id}`} className="block font-medium text-slate-900 hover:text-brand-700 hover:underline">{item.subject}</Link>
                    <div className="mt-0.5 text-[12px] text-slate-500">{truncate(item.content.replace(/\s+/g, " "), 90)}</div>
                  </TD>
                  <TD><InboxStatusBadge status={item.aiStatus} /></TD>
                  <TD className="text-right">
                    {item.aiStatus === "not_processed" || item.aiStatus === "failed" ? (
                      <Link href={`/inbox/${item.id}?run=1`} className={buttonClass("primary", "sm")}>
                        <Sparkles className="h-3.5 w-3.5" /> AIで整理
                      </Link>
                    ) : item.aiStatus === "review_required" && item.proposalId ? (
                      <Link href={`/approvals/${item.proposalId}`} className={buttonClass("outline", "sm")}>提案を確認 <ArrowRight className="h-3.5 w-3.5" /></Link>
                    ) : (
                      <Link href={`/inbox/${item.id}`} className={buttonClass("ghost", "sm")}>詳細</Link>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
