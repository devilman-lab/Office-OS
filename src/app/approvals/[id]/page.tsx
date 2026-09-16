import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProposalReview } from "@/services/approval.service";
import { NotFoundError } from "@/domain/errors";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { ProposalStatusBadge } from "@/components/ui/status";
import { ProposalReviewPanel } from "@/features/proposal/proposal-review-panel";
import { proposalDisplayTitle } from "@/features/proposal/display";
import { prepareDb } from "@/db/snapshot";

export default async function ProposalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await prepareDb();
  const { id } = await params;
  let review;
  try {
    review = getProposalReview(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <div>
      <Link href="/approvals" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" /> 承認一覧へ戻る</Link>
      <PageHeader
        eyebrow={`AI Proposal Review · ${review.proposal.id}`}
        title={proposalDisplayTitle(review.proposal, review.customer?.displayName)}
        badges={<><ProposalStatusBadge status={review.proposal.status} /><Badge tone="violet" mono>AI GENERATED</Badge></>}
        description={review.proposal.status === "pending_review" ? "AI generated proposal. Human review required. — 内容を確認し、必要なら編集してから「承認して登録」してください。" : `${review.proposal.reviewedBy} が処理済み`}
      />
      <ProposalReviewPanel review={review} />
    </div>
  );
}
