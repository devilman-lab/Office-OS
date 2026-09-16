import * as React from "react";

/** Minimal markdown renderer for the knowledge vault (headings, lists, blockquotes, bold). No external dependency. */
export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.type;
    out.push(<Tag key={out.length}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(line.replace(/^\s*[-*]\s+/, ""));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(line.replace(/^\s*\d+\.\s+/, ""));
      continue;
    }
    flush();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) out.push(<h1 key={out.length}>{inline(line.slice(2))}</h1>);
    else if (line.startsWith("## ")) out.push(<h2 key={out.length}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("> ")) out.push(<blockquote key={out.length}>{inline(line.slice(2))}</blockquote>);
    else out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="prose-kb text-[13px] text-slate-800">{out}</div>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
}
