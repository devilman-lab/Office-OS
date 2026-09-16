"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/domain/enums";
import { updateTaskStatusAction } from "@/app/actions";
import { Select } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function TaskStatusSelect({ id, status }: { id: string; status: TaskStatus }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  return (
    <Select
      value={status}
      disabled={busy}
      className="h-8 py-0 text-xs"
      onChange={async (e) => {
        setBusy(true);
        const res = await updateTaskStatusAction(id, e.target.value as TaskStatus);
        setBusy(false);
        if (!res.ok) return toast({ tone: "error", title: "更新できません", description: res.error.message });
        toast({ tone: "success", title: "タスクを更新しました", description: "監査ログに記録されました。" });
        router.refresh();
      }}
    >
      {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>)}
    </Select>
  );
}
