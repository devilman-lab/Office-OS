import { db } from "@/db";
import { SOURCE_LABEL } from "@/domain/enums";
import { caseRepository, customerRepository, interactionRepository, knowledgeRepository, taskRepository } from "@/repositories";

export interface SearchHit {
  category: "顧客" | "案件" | "タスク" | "対応履歴" | "ナレッジ";
  id: string;
  title: string;
  subtitle: string;
  source: string;
  href: string;
}

export function globalSearch(q: string): SearchHit[] {
  db();
  const query = q.trim();
  if (query.length < 1) return [];
  const hits: SearchHit[] = [];
  for (const c of customerRepository.search(query)) hits.push({ category: "顧客", id: c.id, title: c.displayName, subtitle: c.contactPerson ?? "", source: "Business DB", href: `/cases?customer=${c.id}` });
  for (const c of caseRepository.search(query)) hits.push({ category: "案件", id: c.id, title: c.title, subtitle: `${c.status} / 期限 ${c.dueDate ?? "—"}`, source: SOURCE_LABEL[c.source], href: `/cases/${c.id}` });
  for (const t of taskRepository.search(query)) hits.push({ category: "タスク", id: t.id, title: t.title, subtitle: `${t.assignee} / 期限 ${t.dueDate ?? "—"}`, source: SOURCE_LABEL[t.source], href: `/cases/${t.caseId}` });
  for (const i of interactionRepository.search(query)) hits.push({ category: "対応履歴", id: i.id, title: i.subject, subtitle: i.maskedContent.slice(0, 60), source: SOURCE_LABEL[i.source], href: i.caseId ? `/cases/${i.caseId}` : "/interactions" });
  for (const k of knowledgeRepository.searchDocuments(query)) hits.push({ category: "ナレッジ", id: k.id, title: k.title, subtitle: `${k.category} / ${k.verified ? "確認済み" : "未確認"}`, source: "Obsidian (READ ONLY)", href: `/knowledge?doc=${k.id}` });
  return hits.slice(0, 30);
}
