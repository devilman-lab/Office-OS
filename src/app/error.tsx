"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <Notice tone="danger" icon={<AlertTriangle className="h-4 w-4 text-red-600" />} title="画面の表示中にエラーが発生しました">
        <div>{error.message}</div>
        <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={reset}>再試行</Button></div>
      </Notice>
    </div>
  );
}
