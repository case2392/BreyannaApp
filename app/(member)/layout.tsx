import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Brand";
import { NavLink, BottomNavLink } from "@/components/NavLink";
import {
  CalendarIcon,
  TicketIcon,
  CardIcon,
  UserIcon,
  GridIcon,
  SparklesIcon,
  SteamIcon,
} from "@/components/Icons";
import { getSaunaSettings } from "@/lib/sauna";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Record "last seen" whenever they open their account area — throttled to at
  // most once every 10 minutes so it's a cheap, single conditional write.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: tenMinAgo } }],
    },
    data: { lastSeenAt: new Date() },
  });

  // The Sauna tab appears once sauna booking is turned on (staff always see it).
  const sauna = (await getSaunaSettings()).enabled || isStaff(user.role);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/schedule" />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/schedule" label="Schedule" icon={<CalendarIcon className="h-4 w-4" />} />
            <NavLink href="/bookings" label="My Bookings" icon={<TicketIcon className="h-4 w-4" />} />
            {sauna && (
              <NavLink href="/sauna" label="Sauna" icon={<SteamIcon className="h-4 w-4" />} />
            )}
            <NavLink href="/memberships" label="Plans" icon={<CardIcon className="h-4 w-4" />} />
            <NavLink href="/events" label="Events" icon={<SparklesIcon className="h-4 w-4" />} />
            <NavLink href="/account" label="Account" icon={<UserIcon className="h-4 w-4" />} />
          </nav>
          <div className="flex items-center gap-2">
            {isStaff(user.role) && (
              <NavLink href="/admin" label="Studio CRM" icon={<GridIcon className="h-4 w-4" />} />
            )}
            <form action={logout}>
              <button className="btn-ghost text-sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-10">{children}</main>

      {/* Bottom mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-ink-200 bg-white md:hidden">
        <BottomNavLink href="/schedule" label="Schedule" icon={<CalendarIcon />} />
        <BottomNavLink href="/bookings" label="Bookings" icon={<TicketIcon />} />
        {sauna && <BottomNavLink href="/sauna" label="Sauna" icon={<SteamIcon />} />}
        <BottomNavLink href="/memberships" label="Plans" icon={<CardIcon />} />
        <BottomNavLink href="/events" label="Events" icon={<SparklesIcon />} />
        <BottomNavLink href="/account" label="Account" icon={<UserIcon />} />
      </nav>
    </div>
  );
}
