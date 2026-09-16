import Link from "next/link";
import { BookOpen, FolderOpen, Lock, FileText, AlertTriangle } from "lucide-react";
import { getKnowledgeBrowser } from "@/services/knowledge.service";
import { PageHeader, Card, Badge, KeyValue, Notice, SectionLabel, EmptyState } from "@/components/ui/primitives";
import { ReadOnlyBadge, VerifiedBadge } from "@/components/ui/status";
import { Markdown } from "@/features/knowledge/markdown";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ doc?: string; category?: string }> }) {
  const { doc, category } = await searchParams;
  const kb = await getKnowledgeBrowser(doc, category);
  const selected = kb.selected;

  return (
    <div>
      <PageHeader
        eyebrow="Knowledge Source · Obsidian"
        title="ナレッジ（事務所の検証済み知識）"
        description="Obsidian Vault の Markdown を読み取り専用で参照します。AI はこの正本を検索・引用できますが、書き込み・削除はできません。更新は担当者が Obsidian で行い、所長が確認します。"
        badges={<ReadOnlyBadge />}
      />
      <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-900">
        <Lock className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="font-semibold">KNOWLEDGE SOURCE · READ ONLY</span>
        <span>— Provider: {kb.providerName}</span>
        <span className={cn("ml-auto", kb.health.ok ? "text-emerald-700" : "text-red-700")}>{kb.health.ok ? "● " : "✕ "}{kb.health.message}</span>
      </div>
      {!kb.health.ok && <Notice tone="danger" className="mb-4" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} title="ナレッジソースに接続できません">AI はナレッジなしでの回答・提案を行いません。連携画面で Obsidian コネクタを再接続してください。</Notice>}

      <div className="grid grid-cols-[13rem_18rem_minmax(0,1fr)] gap-4">
        <Card className="self-start">
          <div className="border-b border-slate-100 px-3 py-2"><SectionLabel>Knowledge Categories</SectionLabel></div>
          <nav className="p-1.5">
            <Link href="/knowledge" className={cn("flex items-center justify-between rounded px-2 py-1.5 text-[13px]", !category ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50")}><span className="inline-flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5 text-slate-400" /> すべて</span><span className="text-[11px] text-slate-400">{kb.categories.reduce((s, c) => s + c.count, 0)}</span></Link>
            {kb.categories.map((c) => (
              <Link key={c.name} href={`/knowledge?category=${encodeURIComponent(c.name)}`} className={cn("flex items-center justify-between rounded px-2 py-1.5 text-[13px]", category === c.name ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700 hover:bg-slate-50")}><span className="inline-flex items-center gap-1.5"><FolderOpen className="h-3.5 w-3.5 text-slate-400" /> {c.name}</span><span className="text-[11px] text-slate-400">{c.count}</span></Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">vault: office-urizun/ (mirror)</div>
        </Card>

        <Card className="self-start">
          <div className="border-b border-slate-100 px-3 py-2"><SectionLabel>Documents{category ? ` · ${category}` : ""}</SectionLabel></div>
          <ul className="max-h-[70vh] overflow-y-auto p-1.5 scroll-thin">
            {kb.documents.map((d) => (
              <li key={d.id}>
                <Link href={`/knowledge?doc=${d.id}${category ? `&category=${encodeURIComponent(category)}` : ""}`} className={cn("block rounded px-2 py-1.5", selected?.id === d.id ? "bg-brand-50" : "hover:bg-slate-50")}>
                  <div className="flex items-start gap-1.5">
                    <FileText className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", d.verified ? "text-amber-600" : "text-red-400")} />
                    <div className="min-w-0">
                      <div className={cn("truncate text-[12.5px]", selected?.id === d.id ? "font-medium text-brand-800" : "text-slate-800")}>{d.title}</div>
                      <div className="text-[10.5px] text-slate-400">{d.category} · {formatDate(d.updatedAt)} {d.verified ? "" : "· 未確認"}</div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          {!selected ? (
            <div className="p-6"><EmptyState icon={<BookOpen className="h-6 w-6" />} title="ドキュメントを選択してください" /></div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">{selected.title}</h2>
                  <span className="font-mono text-[11px] text-slate-400">{selected.id}</span>
                  <span className="ml-auto"><ReadOnlyBadge /></span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-8">
                  <KeyValue dense items={[
                    { label: "Category", value: <Badge tone="neutral">{selected.category}</Badge> },
                    { label: "Tags", value: <div className="flex flex-wrap gap-1">{selected.tags.map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">#{t}</span>)}</div> },
                    { label: "Source", value: <span className="font-mono text-[11px] text-slate-500">{selected.source}</span> },
                  ]} />
                  <KeyValue dense items={[
                    { label: "Verified", value: <VerifiedBadge verified={selected.verified} /> },
                    { label: "Verified By", value: selected.verifiedBy ?? <span className="text-slate-400">—（未確認）</span> },
                    { label: "Last Updated", value: formatDateTime(selected.updatedAt) },
                    { label: "AI参照回数", value: <span>{kb.usage.referenceCount} 回{kb.usage.lastUsed && <span className="ml-1 text-[11px] text-slate-400">最終 {formatDateTime(kb.usage.lastUsed)}</span>}</span> },
                  ]} />
                </div>
              </div>
              {!selected.verified && <div className="mx-5 mt-4"><Notice tone="danger" title="未確認の文書です">所長の確認が完了していないため、AI の根拠としては使用されません（検索結果には表示されますが引用対象外です）。</Notice></div>}
              <div className="px-5 py-4"><Markdown content={selected.content} /></div>
              <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">この文書を更新するには、担当者が Obsidian で編集し、所長が「確認済み」にします。アプリ・AI からの編集経路は存在しません。</div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
