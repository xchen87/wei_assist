import { prisma } from "@meridian/db";
import { Nav } from "@/components/shell/nav";
import { ChatDock } from "@/components/chat/chat-dock";
import { CommandPalette } from "@/components/shell/command-palette";
import { centsToNumber } from "@/lib/format/money";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The palette's household list, fetched once for the shell rather than
  // by the palette itself — it would otherwise need a client fetch on every
  // page just in case someone presses ⌘K.
  const households = await prisma.household.findMany({
    select: { id: true, name: true, segment: true, aumCents: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paper">
      <Nav />
      <main className="min-w-[560px] flex-1 overflow-y-auto">{children}</main>
      <ChatDock />
      {/* Cents become numbers here: the palette is a client component and
          bigint cannot be serialised across that boundary (D-023). */}
      <CommandPalette
        households={households.map((h) => ({ ...h, aumCents: centsToNumber(h.aumCents) }))}
      />
    </div>
  );
}
