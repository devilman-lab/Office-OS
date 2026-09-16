"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, FolderKanban, CheckSquare, MessagesSquare, BookOpen, Sparkles, Bot, ClipboardCheck, ScrollText, ShieldCheck, TrendingUp, Settings, Plug, Network, GitBranch, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_MAIN = [
  { href: "/", label: "Dashboard", ja: "ダッシュボード", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", ja: "受信トレイ", icon: Inbox },
  { href: "/cases", label: "Cases", ja: "案件", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", ja: "タスク", icon: CheckSquare },
  { href: "/interactions", label: "Interactions", ja: "対応履歴", icon: MessagesSquare },
  { href: "/knowledge", label: "Knowledge", ja: "ナレッジ（Obsidian）", icon: BookOpen },
  { href: "/assistant", label: "AI Assistant", ja: "AI アシスタント", icon: Sparkles },
  { href: "/agent", label: "AI Agent", ja: "AI エージェント", icon: Bot },
  { href: "/approvals", label: "Approvals", ja: "承認", icon: ClipboardCheck },
  { href: "/audit", label: "Audit Logs", ja: "監査ログ", icon: ScrollText },
  { href: "/security", label: "Security", ja: "セキュリティ", icon: ShieldCheck },
  { href: "/effectiveness", label: "Effectiveness", ja: "効果測定", icon: TrendingUp },
  { href: "/settings", label: "Settings", ja: "設定", icon: Settings },
];

export const NAV_SYSTEM = [
  { href: "/integrations", label: "Integrations", ja: "外部連携", icon: Plug },
  { href: "/architecture", label: "Architecture", ja: "システム構成", icon: Network },
  { href: "/data-flow", label: "Data Flow", ja: "データフロー", icon: GitBranch },
  { href: "/backup", label: "Backup", ja: "バックアップ", icon: Database },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ storage = "local-file" }: { storage?: "local-file" | "vercel-blob" | "ephemeral-tmp" | "snapshot-file" }) {
  const pathname = usePathname();
  const render = (items: typeof NAV_MAIN) =>
    items.map((item) => {
      const active = isActive(pathname, item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
            active ? "bg-brand-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
            <span className="truncate font-medium">{item.label}</span>
            <span className={cn("truncate text-[11px]", active ? "text-brand-100" : "text-slate-500")}>{item.ja}</span>
          </span>
        </Link>
      );
    });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[12px] font-bold text-white">う</div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold">OfficeうりずんOS</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Prototype · Demo Mode</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 scroll-thin">
        {render(NAV_MAIN)}
        <div className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">System</div>
        {render(NAV_SYSTEM)}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          MOCK DATA — 架空データ
        </div>
        <div>外部サービスには接続していません</div>
        {storage === "ephemeral-tmp" && <div className="mt-1 text-amber-400/80">Blob ストア未設定のためデモデータは一時保存です（Reset Demo Data で復元）</div>}
        {storage === "vercel-blob" && <div className="mt-1 text-slate-500">デモデータ: Vercel Blob に保存（共有状態）</div>}
      </div>
    </aside>
  );
}
