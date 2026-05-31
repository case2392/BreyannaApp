import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { DwellMark } from "@/components/Brand";
import { NavLink } from "@/components/NavLink";
import {
  GridIcon,
  CalendarIcon,
  UsersIcon,
  DumbbellIcon,
  TagIcon,
  MegaphoneIcon,
} from "@/components/Icons";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/schedule");

  const nav = (
    <>
      <NavLink href="/admin" label="Dashboard" icon={<GridIcon className="h-4 w-4" />} />
      <NavLink href="/admin/schedule" label="Schedule" icon={<CalendarIcon className="h-4 w-4" />} />
      <NavLink href="/admin/members" label="Members" icon={<UsersIcon className="h-4 w-4" />} />
      <NavLink href="/admin/classes" label="Classes" icon={<DumbbellIcon className="h-4 w-4" />} />
      <NavLink href="/admin/plans" label="Plans" icon={<TagIcon className="h-4 w-4" />} />
      <NavLink href="/admin/messages" label="Messages" icon={<MegaphoneIcon className="h-4 w-4" />} />
    </>
  );

  return (
    <div className="min-h-screen bg-ink-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-ink-200 bg-white md:flex md:min-h-screen md:w-64 md:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <DwellMark size={36} />
          <div>
            <div className="font-serif text-base font-semibold leading-tight">DWELL</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-ink-500">Studio CRM</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">{nav}</nav>
        <div className="mt-auto border-t border-ink-100 px-5 py-4">
          <div className="mb-2 text-sm font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <Link href="/schedule" className="text-brand-600 hover:underline">
              Member view →
            </Link>
            <form action={logout}>
              <button className="text-ink-500 hover:underline" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <DwellMark size={30} />
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-ink-500">
              Studio CRM
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/schedule" className="text-brand-600">
              Member view
            </Link>
            <form action={logout}>
              <button className="text-ink-500" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* contained scrolling nav — never widens the page */}
        <div className="scroll-nav border-t border-ink-100 px-3 py-2">
          <div className="flex shrink-0 gap-1 whitespace-nowrap">{nav}</div>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
