import Link from "next/link";
import { ScrollText, ShieldAlert } from "lucide-react";
import { db } from "@/db";
import { auditRepository } from "@/repositories";
import { AUDIT_ACTIONS } from "@/domain/enums";
import { PageHeader, Card, CardHeader, CardBody, Table, THead, TH, TR, TD, Badge, EmptyState, StatCard } from "@/components/ui/primitives";
import { ResultBadge } from "@/components/ui/status";
import { AuditFilters } from "@/features/audit/audit-filters";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; result?: string; actorType?: string; q?: string }> }) {
  const sp = await searchParams;
  db();
  const logs = auditRepository.list({ action: sp.action || undefined, result: sp.result || undefined, actorType: sp.actorType || undefined, q: sp.q || undefined, limit: 300 });
  const byResult = auditRepository.countByResult();
  const total = auditRepository.count();

  return (
    <div>
      <PageHeader eyebrow="Audit Logs" title="監査ログ" description="AI の入力・出力、ナレッジ検索・参照、権限チェック、承認、DB登録、API操作、エラー、拒否された操作をすべて記録します。原本の個人情報はログに含めません。" badges={<Badge tone="neutral">{total} 件</Badge>} />
      <div className="mb-4 grid grid-cols-4 gap-3">
        <StatCard label="Total" value={total} hint="全記録" icon={<ScrollText className="h-4 w-4" />} />
        <StatCard label="Success" value={byResult.success ?? 0} tone="success" />
        <StatCard label="Warning" value={byResult.warning ?? 0} tone="warning" />
        <StatCard label="Denied / Failed" value={(byResult.denied ?? 0) + (byResult.failed ?? 0)} tone="danger" icon={<ShieldAlert className="h-4 w-4" />} href="/audit?result=denied" />
      </div>
      <Card>
        <CardHeader title="ログ一覧" description="新しい順。フィルタは URL に反映されます。" actions={<AuditFilters actions={[...AUDIT_ACTIONS]} current={sp} />} />
        <CardBody padded={false}>
          {logs.length === 0 ? <div className="p-6"><EmptyState icon={<ScrollText className="h-6 w-6" />} title="該当する記録はありません" description="フィルタを変更してください。" action={<Link href="/audit" className="text-xs text-brand-700 hover:underline">フィルタをクリア</Link>} /></div> : (
            <Table>
              <THead><tr><TH className="w-40">Timestamp</TH><TH className="w-28">Actor</TH><TH className="w-52">Action</TH><TH className="w-40">Resource</TH><TH className="w-24">Result</TH><TH>Reason / Metadata</TH></tr></THead>
              <tbody>
                {logs.map((l) => (
                  <TR key={l.id} className={cn(l.result === "denied" && "bg-red-50/40")}>
                    <TD><div className="font-mono text-[11.5px] text-slate-700">{formatDateTime(l.timestamp)}:{new Date(l.timestamp).getSeconds().toString().padStart(2, "0")}</div><div className="font-mono text-[10px] text-slate-400">{l.id}</div></TD>
                    <TD><div className="text-[12px] text-slate-800">{l.actor}</div><Badge tone={l.actorType === "human" ? "brand" : l.actorType === "ai" ? "violet" : "neutral"} mono>{l.actorType}</Badge></TD>
                    <TD><span className={cn("font-mono text-[11.5px] font-semibold", l.result === "denied" ? "text-red-700" : "text-slate-800")}>{l.action}</span></TD>
                    <TD><div className="text-[11px] text-slate-500">{l.resourceType}</div><div className="font-mono text-[11px] text-slate-700">{l.resourceId ?? "—"}</div></TD>
                    <TD><ResultBadge result={l.result} /></TD>
                    <TD>
                      {l.reason && <div className="text-[12px] text-slate-700">{l.reason}</div>}
                      {Object.keys(l.metadata).length > 0 && <div className="mt-0.5 truncate font-mono text-[10.5px] text-slate-400" title={JSON.stringify(l.metadata)}>{JSON.stringify(l.metadata).slice(0, 140)}</div>}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
