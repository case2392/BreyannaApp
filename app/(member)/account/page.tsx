import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { availableGuestPasses } from "@/lib/booking";
import { EditProfileForm, ChangePasswordForm } from "@/components/account/AccountForms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const now = new Date();

  const [bookingCount, attended, activeMemberships] = await Promise.all([
    prisma.booking.count({
      where: { userId: user.id, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({ where: { userId: user.id, status: "ATTENDED" } }),
    prisma.membership.findMany({
      where: { userId: user.id, status: "ACTIVE", expiresAt: { gt: now } },
      include: {
        plan: { select: { name: true, kind: true, guestPassesPerMonth: true } },
      },
      orderBy: { expiresAt: "asc" },
    }),
  ]);
  const guestPasses = availableGuestPasses(activeMemberships);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">My account</h1>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <div className="text-lg font-semibold">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-ink-500">{user.email}</div>
            {user.phone && (
              <div className="text-sm text-ink-500">{user.phone}</div>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-100 pt-6 text-sm">
          <div>
            <dt className="text-ink-500">Member since</dt>
            <dd className="font-medium">{shortDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Total bookings</dt>
            <dd className="font-medium">{bookingCount}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Classes attended</dt>
            <dd className="font-medium">{attended}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Guest passes</dt>
            <dd className="font-medium">
              🎟️ {guestPasses} available
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Account type</dt>
            <dd className="font-medium capitalize">{user.role.toLowerCase()}</dd>
          </div>
        </dl>

        {activeMemberships.length > 0 && (
          <div className="mt-6 border-t border-ink-100 pt-6">
            <div className="mb-2 text-sm font-semibold">Membership</div>
            <ul className="space-y-2 text-sm">
              {activeMemberships.map((m) => {
                const comp =
                  (m.source === "COMP" || m.source === "GIFT") &&
                  !m.stripeSubscriptionId;
                const detail =
                  m.plan.kind === "UNLIMITED"
                    ? comp
                      ? "Never expires"
                      : `${m.autoRenew ? "Renews" : "Expires"} ${shortDate(
                          m.expiresAt
                        )}`
                    : `${m.creditsRemaining} credits · no expiry`;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="font-medium">{m.plan.name}</span>
                    <span className="text-ink-500">{detail}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">Edit profile</h2>
          <EditProfileForm
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            phone={user.phone ?? ""}
          />
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">Change password</h2>
          <ChangePasswordForm />
        </div>
      </div>

      <nav
        aria-label="Legal"
        className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-ink-500"
      >
        <Link href="/privacy" className="hover:text-brand-600">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-brand-600">
          Terms of Service
        </Link>
        <Link href="/accessibility" className="hover:text-brand-600">
          Accessibility
        </Link>
      </nav>
    </div>
  );
}
