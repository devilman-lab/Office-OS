import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CURRENT_USER } from "@/security/current-user";
import { isEphemeralStorage } from "@/db/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar ephemeral={isEphemeralStorage()} />
      <div className="pl-60">
        <Topbar userName={CURRENT_USER.name} />
        <main className="mx-auto w-full max-w-[1400px] px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
