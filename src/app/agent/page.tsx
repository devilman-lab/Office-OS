import { PageHeader, Badge } from "@/components/ui/primitives";
import { listAgentTools } from "@/services/agent.service";
import { AgentConsole } from "@/features/agent/agent-console";
import { prepareDb } from "@/db/snapshot";

export default async function AgentPage() {
  await prepareDb();
  const tools = listAgentTools();
  return (
    <div>
      <PageHeader eyebrow="AI Agent · Permission Boundary" title="AI エージェント" description="エージェントが利用できるツールと権限。ALLOWED は自動実行、APPROVAL REQUIRED は担当者の承認が必要、DENIED は実行不可です。すべての権限チェックは監査ログに記録されます。" badges={<><Badge tone="violet" mono>AGENT RUNTIME · SIMULATED</Badge><Badge tone="danger" mono>DENY BY DEFAULT</Badge></>} />
      <AgentConsole tools={tools} />
    </div>
  );
}
