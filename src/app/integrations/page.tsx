import { listIntegrations } from "@/services/integration.service";
import { PageHeader, Badge, Notice } from "@/components/ui/primitives";
import { IntegrationCards } from "@/features/integrations/integration-cards";
import { prepareDb } from "@/db/snapshot";

export default async function IntegrationsPage() {
  await prepareDb();
  const integrations = listIntegrations();
  return (
    <div>
      <PageHeader eyebrow="External Integrations" title="外部連携" description="Gmail / LINE WORKS / Notion / Obsidian / 音声メモ のコネクタ。プロトタイプではすべて Mock Connector で、実際のサービスには接続していません。同期・失敗・再試行・重複検出は実際のコードパスで動作します。" badges={<Badge tone="violet" mono>ALL CONNECTORS SIMULATED</Badge>} />
      <Notice tone="neutral" className="mb-4" title="CONNECTED / SIMULATED の表示について">本番では各サービスの API（OAuth / Service Account / Integration Token）で接続し、必要最小限のスコープのみ付与します。ここでは「SIMULATED」と明示し、実接続と誤認しないようにしています。</Notice>
      <IntegrationCards integrations={integrations} />
    </div>
  );
}
