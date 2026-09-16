"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, RotateCcw, Mail, MessageSquare, Database, BookOpen, Mic, CheckCircle2, XCircle, Copy, Lock } from "lucide-react";
import type { Integration } from "@/domain/types";
import type { SyncResult } from "@/services/integration.service";
import { retryIntegrationAction, syncIntegrationAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, Badge, KeyValue, Notice } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICON: Record<Integration["kind"], React.ElementType> = { gmail: Mail, line_works: MessageSquare, notion: Database, obsidian: BookOpen, voice_memo: Mic };

export function IntegrationCards({ integrations }: { integrations: Integration[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, SyncResult>>({});

  const act = async (id: string, kind: "sync" | "retry") => {
    setBusy(id);
    const res = kind === "sync" ? await syncIntegrationAction(id) : await retryIntegrationAction(id);
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "同期に失敗しました", description: res.error.message });
    setResults((r) => ({ ...r, [id]: res.data }));
    toast({ tone: res.data.outcome === "failed" ? "error" : res.data.outcome === "duplicate" ? "warning" : "success", title: res.data.title, description: res.data.message });
    router.refresh();
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {integrations.map((i) => {
        const Icon = ICON[i.kind];
        const r = results[i.id];
        const failed = i.lastSyncResult === "failed" || i.status === "error";
        return (
          <Card key={i.id} className={cn(failed && "border-red-300", i.status === "disconnected" && "border-amber-300")}>
            <CardBody>
              <div className="flex items-start gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", i.kind === "obsidian" ? "bg-amber-50 text-amber-700" : i.kind === "notion" ? "bg-slate-100 text-slate-800" : "bg-brand-50 text-brand-700")}><Icon className="h-4.5 w-4.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{i.name}</span>
                    <Badge tone={i.status === "simulated" ? "violet" : i.status === "error" ? "danger" : "warning"} mono>{i.status === "simulated" ? "SIMULATED" : i.status === "error" ? "ERROR" : "DISCONNECTED"}</Badge>
                    {i.kind === "obsidian" && <Badge tone="warning" mono><Lock className="h-3 w-3" /> READ ONLY</Badge>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{i.notes}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6">
                <KeyValue dense items={[
                  { label: "Authentication", value: <span className="text-[12px]">{i.authentication}</span> },
                  { label: "Last Sync", value: <span className="text-[12px]">{formatDateTime(i.lastSync)} {i.lastSyncResult && <Badge tone={i.lastSyncResult === "success" ? "success" : i.lastSyncResult === "duplicate" ? "warning" : "danger"} mono>{i.lastSyncResult}</Badge>}</span> },
                ]} />
                <KeyValue dense items={[
                  { label: "Records", value: <span className="font-mono text-[12px]">{i.records}</span> },
                  { label: "Errors / Dup", value: <span className="font-mono text-[12px]"><span className={i.errors > 0 ? "text-red-600" : ""}>{i.errors}</span> / {i.duplicates}</span> },
                ]} />
              </div>
              {(r || failed) && (
                <div className="mt-3">
                  {r ? (
                    <Notice tone={r.outcome === "completed" ? "success" : r.outcome === "duplicate" ? "warning" : "danger"} icon={r.outcome === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : r.outcome === "duplicate" ? <Copy className="h-4 w-4 text-amber-600" /> : <XCircle className="h-4 w-4 text-red-600" />} title={r.title}>
                      {r.message}{r.nextAction && <div className="mt-1 font-medium">次にすること: {r.nextAction}{r.newRecords > 0 && <> <Link href="/inbox" className="text-brand-700 underline">Inbox を開く</Link></>}</div>}
                    </Notice>
                  ) : (
                    <Notice tone="danger" icon={<XCircle className="h-4 w-4 text-red-600" />} title="SYNC FAILED">直近の同期が失敗しています。「再試行」で再認証して再同期します。</Notice>
                  )}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" loading={busy === i.id} onClick={() => act(i.id, "sync")} icon={<RefreshCw className="h-3.5 w-3.5" />}>同期を実行（Mock）</Button>
                {(failed || i.failNextSync) && <Button size="sm" variant="secondary" loading={busy === i.id} onClick={() => act(i.id, "retry")} icon={<RotateCcw className="h-3.5 w-3.5" />}>再試行（Retry）</Button>}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
