import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getCaseDetail } from "@/services/case.service";
import { NotFoundError } from "@/domain/errors";
import { PageHeader, Badge } from "@/components/ui/primitives";
import { CaseStatusBadge, PriorityBadge, SourceBadge } from "@/components/ui/status";
import { CaseDetailView } from "@/features/cases/case-detail-view";
import { prepareDb } from "@/db/snapshot";

export default async function CaseDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  await prepareDb();
  const { id } = await params;
  const { tab } = await searchParams;
  let detail;
  try {
    detail = getCaseDetail(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  return (
    <div>
      <Link href="/cases" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"><ArrowLeft className="h-3.5 w-3.5" /> 案件一覧へ戻る</Link>
      <PageHeader
        eyebrow={`Case · ${detail.case.id}`}
        title={detail.case.title}
        badges={<><CaseStatusBadge status={detail.case.status} /><PriorityBadge priority={detail.case.priority} />{detail.case.source === "ai" ? <Badge tone="violet"><Sparkles className="h-3 w-3" /> AI提案から登録</Badge> : <SourceBadge source={detail.case.source} />}</>}
        description={detail.customer?.displayName}
      />
      <CaseDetailView detail={detail} initialTab={tab} />
    </div>
  );
}
