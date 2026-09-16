import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { listInteractions } from "@/services/case.service";
import { INTERACTION_TYPE_LABEL } from "@/domain/enums";
import { PageHeader, Card, Table, THead, TH, TR, TD, Badge, EmptyState } from "@/components/ui/primitives";
import { SourceBadge } from "@/components/ui/status";
import { formatDateTime } from "@/lib/format";
import { truncate } from "@/lib/utils";
import { prepareDb } from "@/db/snapshot";

export default async function InteractionsPage() {
  await prepareDb();
  const rows = listInteractions();
  return (
    <div>
      <PageHeader eyebrow="Interactions" title="対応履歴" description="メール・電話・面談・音声メモ・LINE WORKS のやり取りを顧客・案件に紐付けて管理します。原本と匿名化版を分離して保存しています。" badges={<Badge tone="neutral">{rows.length} 件</Badge>} />
      <Card>
        {rows.length === 0 ? <div className="p-6"><EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="対応履歴はありません" /></div> : (
          <Table>
            <THead><tr><TH>Date</TH><TH>Type</TH><TH>Source</TH><TH>Customer</TH><TH>Subject / 匿名化版プレビュー</TH><TH>Case</TH></tr></THead>
            <tbody>
              {rows.map((i) => (
                <TR key={i.id}>
                  <TD className="font-mono text-[12px] text-slate-500">{formatDateTime(i.createdAt)}</TD>
                  <TD className="text-[13px]">{INTERACTION_TYPE_LABEL[i.type]}</TD>
                  <TD><SourceBadge source={i.source} /></TD>
                  <TD className="text-[13px]">{i.customerName ?? <span className="text-slate-400">未紐付け</span>}</TD>
                  <TD><div className="font-medium text-slate-800">{i.subject}</div><div className="font-mono text-[11px] text-slate-500">{truncate(i.maskedContent.replace(/\s+/g, " "), 80)}</div></TD>
                  <TD>{i.caseId ? <Link href={`/cases/${i.caseId}`} className="text-[12px] text-brand-700 hover:underline">{i.caseTitle}</Link> : <span className="text-[12px] text-slate-400">—</span>}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
