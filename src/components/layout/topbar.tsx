"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Play, RotateCcw, UserCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useDemoGuide } from "@/features/demo/demo-guide-provider";
import { globalSearchAction, resetDemoAction } from "@/app/actions";
import type { SearchHit } from "@/services/search.service";
import { cn } from "@/lib/utils";

export function Topbar({ userName }: { userName: string }) {
  const router = useRouter();
  const toast = useToast();
  const guide = useDemoGuide();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, startReset] = React.useTransition();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doReset = () =>
    startReset(async () => {
      const res = await resetDemoAction();
      if (res.ok) {
        guide.setContext({ proposalId: null, caseId: null });
        toast({ tone: "success", title: "デモデータをリセットしました", description: "案件・タスク・提案・監査ログ・指標を初期状態に戻しました。" });
        setResetOpen(false);
        router.push("/");
        router.refresh();
      } else {
        toast({ tone: "error", title: "リセットに失敗しました", description: res.error.message });
      }
    });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-5 backdrop-blur">
      <button onClick={() => setSearchOpen(true)} className="flex h-8 w-80 max-w-full items-center gap-2 overflow-hidden rounded-md border border-slate-300 bg-slate-50 px-2.5 text-left text-sm text-slate-500 hover:bg-white">
        <Search className="h-4 w-4 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">顧客・案件・ナレッジを検索</span>
        <kbd className="rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-400">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <Badge tone="violet" mono>DEMO MODE</Badge>
        {guide.active ? (
          <Button size="sm" variant="outline" onClick={guide.stop}>ガイドを終了</Button>
        ) : (
          <Button size="sm" onClick={guide.start} icon={<Play className="h-3.5 w-3.5" />}>Start Guided Demo</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)} icon={<RotateCcw className="h-3.5 w-3.5" />}>Reset Demo Data</Button>
        <div className="ml-1 flex items-center gap-1.5 border-l border-slate-200 pl-3 text-sm text-slate-700">
          <UserCircle2 className="h-5 w-5 text-slate-400" />
          <span>{userName}</span>
        </div>
      </div>

      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="デモデータをリセットしますか？"
        description="案件・タスク・AI提案・監査ログ・効果測定の指標がすべて初期状態に戻ります。ナレッジ（Obsidian）は変更されません。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetOpen(false)}>キャンセル</Button>
            <Button variant="danger" onClick={doReset} loading={resetting}>リセットする</Button>
          </>
        }
      />
    </header>
  );
}

function GlobalSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const close = () => { setQ(""); setHits([]); setLoading(false); onClose(); };

  React.useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await globalSearchAction(q);
      setHits(res.ok ? res.data : []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  if (!open) return null;
  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, h) => { (acc[h.category] ??= []).push(h); return acc; }, {});

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl animate-fade-in-up">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input ref={inputRef} autoFocus value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) setHits([]); }} placeholder="検索キーワード（例: 資格取得、CASE-0002、サンプル商事）" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" onKeyDown={(e) => e.key === "Escape" && close()} />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          <kbd className="rounded border border-slate-200 px-1.5 font-mono text-[10px] text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scroll-thin">
          {!q.trim() ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">顧客 / 案件 / タスク / 対応履歴 / ナレッジ を横断検索します。</div>
          ) : hits.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">「{q}」に一致する結果はありません。</div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="py-2">
                <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{cat} <span className="text-slate-300">({items.length})</span></div>
                {items.map((h) => (
                  <button key={h.category + h.id} onClick={() => { router.push(h.href); close(); }} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50">
                    <span className="w-24 shrink-0 font-mono text-[11px] text-slate-400">{h.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{h.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">{h.subtitle}</span>
                    </span>
                    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium", h.source.includes("Obsidian") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-500")}>{h.source}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
