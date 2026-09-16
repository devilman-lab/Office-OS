"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import { createBackupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function BackupButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button loading={busy} icon={<HardDrive className="h-4 w-4" />} onClick={async () => {
      setBusy(true);
      const res = await createBackupAction("手動バックアップ");
      setBusy(false);
      if (!res.ok) return toast({ tone: "error", title: "バックアップに失敗しました", description: res.error.message });
      toast({ tone: res.data.status === "healthy" ? "success" : "error", title: res.data.status === "healthy" ? "バックアップを作成しました" : "バックアップに失敗しました", description: `${res.data.id} · ${res.data.records} records` });
      router.refresh();
    }}>今すぐバックアップ</Button>
  );
}
