import { redirect } from "next/navigation";
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
} from "@/components/Icons";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/schedule" />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/schedule" label="Schedule" icon={<CalendarIcon className="h-4 w-4" />} />
            <NavLink href="/bookings" label="My Bookings" icon={<TicketIcon className="h-4 w-4" />} />
            <NavLink href="/memberships" label="Memberships" icon={<CardIcon className="h-4 w-4" />} />
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
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-10">{children}</main>

      {/* Bottom mobile nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-ink-200 bg-white md:hidden">
        <BottomNavLink href="/schedule" label="Schedule" icon={<CalendarIcon />} />
        <BottomNavLink href="/bookings" label="Bookings" icon={<TicketIcon />} />
        <BottomNavLink href="/memberships" label="Plans" icon={<CardIcon />} />
        <BottomNavLink href="/account" label="Account" icon={<UserIcon />} />
      </nav>
    </div>
  );
}
