import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { inboxRepository, proposalRepository } from "@/repositories";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { InboxStatusBadge, SourceBadge } from "@/components/ui/status";
import { InboxProcessor } from "@/features/inbox/inbox-processor";
import { prepareDb } from "@/db/snapshot";

export default async function InboxItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ run?: string }> }) {
  await prepareDb();
  const { id } = await params;
  const { run } = await searchParams;
  db();
  const item = inboxRepository.findById(id);
  if (!item) notFound();
  const proposal = item.proposalId ? proposalRepository.findById(item.proposalId) : null;

  return (
    <div>
      <Link href="/inbox" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" /> 受信トレイへ戻る</Link>
      <PageHeader
        eyebrow={`Inbox · ${item.id}`}
        title={item.subject}
        badges={<><SourceBadge source={item.source} /><InboxStatusBadge status={item.aiStatus} /><Badge tone="violet" mono>MOCK DATA</Badge></>}
        description={`${item.senderOrganization ?? ""} ${item.sender}`}
      />
      <InboxProcessor item={item} existingProposal={proposal} autoRun={run === "1" && (item.aiStatus === "not_processed" || item.aiStatus === "failed")} />
    </div>
  );
}
