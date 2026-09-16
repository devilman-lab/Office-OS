import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import type { SerializableKnowledgeHit } from "@/services/pipeline.types";
import { RelevanceBadge, VerifiedBadge } from "@/components/ui/status";
import { Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KnowledgeHitCard({ hit, index, compact }: { hit: SerializableKnowledgeHit; index?: number; compact?: boolean }) {
  return (
    <div className={cn("rounded-md border bg-white", hit.verified ? "border-slate-200" : "border-red-200 bg-red-50/30", compact ? "px-3 py-2.5" : "px-4 py-3")}>
      <div className="flex items-start gap-3">
        {index !== undefined && <span className="mt-0.5 font-mono text-[11px] text-slate-400">{String(index).padStart(2, "0")}</span>}
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/knowledge?doc=${hit.documentId}`} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">{hit.title}</Link>
            <span className="font-mono text-[11px] text-slate-400">{hit.documentId}</span>
            <ExternalLink className="h-3 w-3 text-slate-300" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{hit.category}</Badge>
            <VerifiedBadge verified={hit.verified} />
            <RelevanceBadge relevance={hit.relevance} />
            <span className="font-mono text-[11px] text-slate-400">score {hit.score.toFixed(2)}</span>
            <span className="text-[11px] text-slate-400">Updated: {formatDate(hit.updatedAt)}</span>
          </div>
          {!compact && (
            <>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{hit.snippet}</p>
              {hit.matchedTerms.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {hit.matchedTerms.map((t) => <span key={t} className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">{t}</span>)}
                </div>
              )}
              {!hit.verified && <div className="mt-2 text-[11px] text-red-700">未確認の文書のため、AI の根拠には使用されません。</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
