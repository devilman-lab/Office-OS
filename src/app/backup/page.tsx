import { HardDrive, BookOpen } from "lucide-react";
import { listBackups } from "@/services/integration.service";
import { db } from "@/db";
import { countRows, getDb } from "@/db/client";
import { knowledgeRepository } from "@/repositories";
import { PageHeader, Card, CardHeader, CardBody, Badge, StatCard, Table, THead, TH, TR, TD, KeyValue } from "@/components/ui/primitives";
import { BackupButton } from "@/features/settings/backup-button";
import { formatDateTime } from "@/lib/format";

export default function BackupPage() {
  db();
  const backups = listBackups();
  const last = backups[0];
  const records = ["customers", "cases", "tasks", "interactions", "ai_proposals", "knowledge_references"].reduce((s, t) => s + countRows(getDb(), t), 0);
  return (
    <div>
      <PageHeader eyebrow="Backup & Restore" title="バックアップ" description="業務DBのバックアップと復元ポイント。プロトタイプでは SQLite ファイルを実際に data/backups/ へ複製します。ナレッジ（Obsidian Vault）は Vault 側の Git / クラウド同期で保全します。" badges={<Badge tone="violet" mono>PROTOTYPE</Badge>} actions={<BackupButton />} />
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Last Backup" value={last ? formatDateTime(last.createdAt) : "—"} hint={last?.label} icon={<HardDrive className="h-4 w-4" />} />
        <StatCard label="Backup Status" value={last?.status === "healthy" ? "HEALTHY" : "ATTENTION"} tone={last?.status === "healthy" ? "success" : "danger"} />
        <StatCard label="Records (current)" value={records} hint="顧客・案件・タスク・対応履歴・提案・参照" />
        <StatCard label="Knowledge Documents" value={knowledgeRepository.countDocuments()} hint="Vault 側で別途保全" icon={<BookOpen className="h-4 w-4" />} />
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-5">
        <Card>
          <CardHeader eyebrow="Restore Points" title="復元ポイント" />
          <CardBody padded={false}>
            <Table>
              <THead><tr><TH>ID</TH><TH>Created</TH><TH>Label</TH><TH>Status</TH><TH>Records</TH><TH>Knowledge</TH><TH>File</TH></tr></THead>
              <tbody>
                {backups.map((b) => (
                  <TR key={b.id}>
                    <TD className="font-mono text-[12px]">{b.id}</TD>
                    <TD className="font-mono text-[12px]">{formatDateTime(b.createdAt)}</TD>
                    <TD className="text-[13px]">{b.label}</TD>
                    <TD><Badge tone={b.status === "healthy" ? "success" : "danger"} mono>{b.status.toUpperCase()}</Badge></TD>
                    <TD className="font-mono text-[12px]">{b.records}</TD>
                    <TD className="font-mono text-[12px]">{b.knowledgeDocuments}</TD>
                    <TD className="font-mono text-[10.5px] text-slate-400">{b.filePath ? b.filePath.split(/[\/]/).slice(-2).join("/") : "（シード）"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
        <Card>
          <CardHeader eyebrow="Design" title="バックアップ・復旧方針" />
          <CardBody>
            <KeyValue dense items={[
              { label: "業務DB", value: "日次自動 + 手動。本番は Notion のエクスポートを暗号化保管し、復旧手順書に従い復元。" },
              { label: "ナレッジ", value: "Obsidian Vault を Git / クラウド同期でバージョン管理。AI は書き込まないため、復旧対象は人間の編集のみ。" },
              { label: "監査ログ", value: "追記専用。バックアップに含め、改ざん検知のためハッシュを記録（本番）。" },
              { label: "復旧テスト", value: "検収時に復元ポイントからの復旧を実演し、手順書に結果を添付。" },
            ]} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
