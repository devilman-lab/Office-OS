import { getDb } from "@/db/client";
import type { AgentPermission } from "@/domain/types";
import type { AgentAction } from "@/domain/enums";

type Row = { id: string; action: string; permission: string; approval_required: number; description: string };

function map(r: Row): AgentPermission {
  return {
    id: r.id,
    action: r.action as AgentAction,
    permission: r.permission as AgentPermission["permission"],
    approvalRequired: r.approval_required === 1,
    description: r.description,
  };
}

export const permissionRepository = {
  list(): AgentPermission[] {
    return (getDb().prepare("SELECT * FROM agent_permissions ORDER BY rowid").all() as Row[]).map(map);
  },
  findByAction(action: string): AgentPermission | null {
    const r = getDb().prepare("SELECT * FROM agent_permissions WHERE action = ?").get(action) as Row | undefined;
    return r ? map(r) : null;
  },
  seed(p: AgentPermission) {
    getDb()
      .prepare("INSERT INTO agent_permissions(id, action, permission, approval_required, description) VALUES (?,?,?,?,?)")
      .run(p.id, p.action, p.permission, p.approvalRequired ? 1 : 0, p.description);
  },
};
