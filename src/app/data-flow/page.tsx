import { PageHeader, Badge } from "@/components/ui/primitives";
import { DataFlowExplorer } from "@/features/architecture/data-flow-explorer";

export default function DataFlowPage() {
  return (
    <div>
      <PageHeader eyebrow="Data Flow" title="データフロー" description="Input → Normalize → Mask → Classify → Retrieve → Generate → Validate → Human Review → Persist → Audit。各ステップで扱うデータと監査ログを確認できます。" badges={<Badge tone="violet" mono>PROTOTYPE</Badge>} />
      <DataFlowExplorer />
    </div>
  );
}
