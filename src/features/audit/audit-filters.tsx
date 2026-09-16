"use client";

import { useRouter } from "next/navigation";
import { Select, Input } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AuditFilters({ actions, current }: { actions: string[]; current: { action?: string; result?: string; actorType?: string; q?: string } }) {
  const router = useRouter();
  const apply = (patch: Partial<typeof current>) => {
    const next = { ...current, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    router.push(`/audit${params.toString() ? `?${params}` : ""}`);
  };
  return (
    <div className="flex items-center gap-2">
      <Input placeholder="検索（理由・ID）" defaultValue={current.q ?? ""} className="h-8 w-44 py-0 text-xs" onKeyDown={(e) => e.key === "Enter" && apply({ q: (e.target as HTMLInputElement).value })} />
      <Select value={current.actorType ?? ""} onChange={(e) => apply({ actorType: e.target.value })} className="h-8 w-28 py-0 text-xs"><option value="">Actor: all</option><option value="human">human</option><option value="ai">ai</option><option value="system">system</option></Select>
      <Select value={current.result ?? ""} onChange={(e) => apply({ result: e.target.value })} className="h-8 w-32 py-0 text-xs"><option value="">Result: all</option><option value="success">success</option><option value="warning">warning</option><option value="denied">denied</option><option value="failed">failed</option></Select>
      <Select value={current.action ?? ""} onChange={(e) => apply({ action: e.target.value })} className="h-8 w-52 py-0 text-xs"><option value="">Action: all</option>{actions.map((a) => <option key={a} value={a}>{a}</option>)}</Select>
      {(current.action || current.result || current.actorType || current.q) && <Button size="xs" variant="ghost" onClick={() => router.push("/audit")}>クリア</Button>}
    </div>
  );
}
