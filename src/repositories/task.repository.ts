import { getDb, nextId } from "@/db/client";
import type { Task } from "@/domain/types";
import { nowIso } from "@/lib/utils";

type Row = {
  id: string; case_id: string; title: string; description: string; status: string; priority: string;
  due_date: string | null; assignee: string; source: string; created_at: string; updated_at: string;
};

function map(r: Row): Task {
  return {
    id: r.id,
    caseId: r.case_id,
    title: r.title,
    description: r.description,
    status: r.status as Task["status"],
    priority: r.priority as Task["priority"],
    dueDate: r.due_date,
    assignee: r.assignee,
    source: r.source as Task["source"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const taskRepository = {
  list(): Task[] {
    return (getDb().prepare("SELECT * FROM tasks ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, created_at DESC").all() as Row[]).map(map);
  },
  listByCase(caseId: string): Task[] {
    return (getDb().prepare("SELECT * FROM tasks WHERE case_id = ? ORDER BY due_date ASC, created_at ASC").all(caseId) as Row[]).map(map);
  },
  findById(id: string): Task | null {
    const r = getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  search(q: string): Task[] {
    const like = `%${q}%`;
    return (getDb().prepare("SELECT * FROM tasks WHERE title LIKE ? OR description LIKE ? OR id LIKE ? LIMIT 10").all(like, like, like) as Row[]).map(map);
  },
  create(input: Omit<Task, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Task {
    const db = getDb();
    const id = input.id ?? nextId(db, "TASK");
    const ts = input.createdAt ?? nowIso();
    db.prepare(
      `INSERT INTO tasks(id, case_id, title, description, status, priority, due_date, assignee, source, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.caseId, input.title, input.description, input.status, input.priority, input.dueDate, input.assignee, input.source, ts, ts);
    return this.findById(id)!;
  },
  update(id: string, patch: Partial<Pick<Task, "status" | "priority" | "dueDate" | "assignee">>): Task {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.status !== undefined) { sets.push("status = ?"); params.push(patch.status); }
    if (patch.priority !== undefined) { sets.push("priority = ?"); params.push(patch.priority); }
    if (patch.dueDate !== undefined) { sets.push("due_date = ?"); params.push(patch.dueDate); }
    if (patch.assignee !== undefined) { sets.push("assignee = ?"); params.push(patch.assignee); }
    sets.push("updated_at = ?"); params.push(nowIso());
    params.push(id);
    db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  },
  count(filter?: { source?: string }): number {
    if (filter?.source) return (getDb().prepare("SELECT COUNT(*) c FROM tasks WHERE source = ?").get(filter.source) as { c: number }).c;
    return (getDb().prepare("SELECT COUNT(*) c FROM tasks").get() as { c: number }).c;
  },
};
