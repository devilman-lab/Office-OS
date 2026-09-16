import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { DemoGuideProvider } from "@/features/demo/demo-guide-provider";
import { DemoGuidePanel } from "@/features/demo/demo-guide-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OfficeうりずんOS — Prototype",
  description: "士業事務所向け AI 業務統合 OS のインタラクティブ・プロトタイプ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">
        <ToastProvider>
          <DemoGuideProvider>
            <AppShell>{children}</AppShell>
            <DemoGuidePanel />
          </DemoGuideProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
