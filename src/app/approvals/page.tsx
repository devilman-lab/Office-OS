import Link from "next/link";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { db } from "@/db";
import { proposalRepository, customerRepository } from "@/repositories";
import { PageHeader, Card, CardHeader, CardBody, Table, THead, TH, TR, TD, Badge, EmptyState } from "@/components/ui/primitives";
import { ConfidenceBadge, PriorityBadge, ProposalStatusBadge } from "@/components/ui/status";
import { buttonClass } from "@/components/ui/button-class";
import { formatDate, formatDateTime } from "@/lib/format";
import { ResponsibleAINotice } from "@/components/ui/responsible-ai";
import { proposalDisplayTitle } from "@/features/proposal/display";
import { prepareDb } from "@/db/snapshot";

export default async function ApprovalsPage() {
  await prepareDb();
  db();
  const proposals = proposalRepository.list();
  const customers = new Map(customerRepository.list().map((c) => [c.id, c.displayName]));
  const pending = proposals.filter((p) => p.status === "pending_review");
  const reviewed = proposals.filter((p) => p.status !== "pending_review");

  const row = (p: (typeof proposals)[number]) => (
    <TR key={p.id}>
      <TD className="font-mono text-[12px] text-slate-500">{p.id}</TD>
      <TD>
        <Link href={`/approvals/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{proposalDisplayTitle(p, p.customer.customerId ? customers.get(p.customer.customerId) : null)}</Link>
        <div className="text-[11px] text-slate-500">{p.intentLabel}</div>
      </TD>
      <TD className="text-[13px]">{p.customer.customerId ? customers.get(p.customer.customerId) : <span className="text-slate-500">新規顧客候補</span>}</TD>
      <TD><PriorityBadge priority={p.caseProposal.priority} /></TD>
      <TD className="font-mono text-[12px]">{p.caseProposal.dueDate ? formatDate(p.caseProposal.dueDate) : <span className="text-red-600">未設定</span>}</TD>
      <TD><ConfidenceBadge confidence={p.confidence} /></TD>
      <TD>
        <ProposalStatusBadge status={p.status} />
        {p.missingInformation.some((m) => m.severity === "required") && <div className="mt-1 text-[11px] text-red-600">不足情報あり</div>}
      </TD>
      <TD className="font-mono text-[12px] text-slate-500">{formatDateTime(p.createdAt)}</TD>
      <TD className="text-right"><Link href={`/approvals/${p.id}`} className={buttonClass(p.status === "pending_review" ? "primary" : "ghost", "sm")}>{p.status === "pending_review" ? "確認する" : "表示"} <ArrowRight className="h-3.5 w-3.5" /></Link></TD>
    </TR>
  );

  const head = (
    <THead>
      <tr><TH>ID</TH><TH>Case Proposal</TH><TH>Customer</TH><TH>Priority</TH><TH>Deadline</TH><TH>AI Confidence</TH><TH>Status</TH><TH>Created</TH><TH></TH></tr>
    </THead>
  );

  return (
    <div>
      <PageHeader eyebrow="Human Approval" title="承認" description="AI が生成した案件・タスク候補は、担当者が内容を確認し「承認して登録」を押すまで業務DBには登録されません。" badges={<Badge tone="warning">確認待ち {pending.length} 件</Badge>} />
      <div className="mb-4"><ResponsibleAINotice compact /></div>
      <Card className="mb-5">
        <CardHeader eyebrow="Pending review" title="確認待ちの AI 提案" description="AI generated proposal. Human review required." />
        <CardBody padded={false}>
          {pending.length === 0 ? <div className="p-6"><EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="確認待ちの提案はありません" description="Inbox で「AIで整理」を実行すると、提案がここに表示されます。" /></div> : <Table>{head}<tbody>{pending.map(row)}</tbody></Table>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader eyebrow="History" title="処理済みの提案" />
        <CardBody padded={false}>
          {reviewed.length === 0 ? <div className="p-6"><EmptyState title="処理済みの提案はありません" /></div> : <Table>{head}<tbody>{reviewed.map(row)}</tbody></Table>}
        </CardBody>
      </Card>
    </div>
  );
}
