import { Nav } from "@/components/shell/Nav";
import { ChatDock } from "@/components/chat/ChatDock";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper">
      <Nav />
      <main className="min-w-[560px] flex-1 overflow-y-auto">{children}</main>
      <ChatDock />
    </div>
  );
}
