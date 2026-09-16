import Link from "next/link";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button-class";

export default function NotFound() {
  return (
    <div className="py-16">
      <EmptyState title="ページが見つかりません" description="URL が正しいか、データがリセットされていないか確認してください。" action={<Link href="/" className={buttonClass("primary", "sm")}>ダッシュボードへ</Link>} />
    </div>
  );
}
