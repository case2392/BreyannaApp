import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";
import {
  GridIcon,
  CalendarIcon,
  UsersIcon,
  DumbbellIcon,
  TagIcon,
} from "@/components/Icons";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/schedule");

  return (
    <div className="min-h-screen bg-ink-50 md:flex">
      {/* Sidebar */}
      <aside className="border-b border-ink-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-lg font-black text-white">
            B
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">Breyanna Fitness</div>
            <div className="text-xs text-ink-500">Studio CRM</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:space-y-1 md:overflow-visible">
          <NavLink href="/admin" label="Dashboard" icon={<GridIcon className="h-4 w-4" />} />
          <NavLink href="/admin/schedule" label="Schedule" icon={<CalendarIcon className="h-4 w-4" />} />
          <NavLink href="/admin/members" label="Members" icon={<UsersIcon className="h-4 w-4" />} />
          <NavLink href="/admin/classes" label="Classes" icon={<DumbbellIcon className="h-4 w-4" />} />
          <NavLink href="/admin/plans" label="Plans" icon={<TagIcon className="h-4 w-4" />} />
        </nav>
        <div className="hidden border-t border-ink-100 px-5 py-4 md:block">
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

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
