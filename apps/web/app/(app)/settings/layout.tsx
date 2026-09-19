import { prisma } from "@meridian/db";
import { SettingsNav } from "@/components/settings/settings-nav";
import { CURRENT_ADVISOR_NAME } from "@/lib/current-advisor";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // There's no Org record to name the firm with (see D-014), so the rail
  // subtitle states the book's real scale instead of an invented firm name.
  const [households, advisors] = await Promise.all([
    prisma.household.count(),
    prisma.advisor.count(),
  ]);

  return (
    <div className="flex h-full">
      <SettingsNav
        advisorName={CURRENT_ADVISOR_NAME}
        orgLabel={`${households} households · ${advisors} advisors`}
      />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
