import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { EditProfileForm, ChangePasswordForm } from "@/components/account/AccountForms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = (await getCurrentUser())!;

  const [bookingCount, attended] = await Promise.all([
    prisma.booking.count({
      where: { userId: user.id, status: { not: "CANCELLED" } },
    }),
    prisma.booking.count({ where: { userId: user.id, status: "ATTENDED" } }),
  ]);

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
            <dt className="text-ink-500">Account type</dt>
            <dd className="font-medium capitalize">{user.role.toLowerCase()}</dd>
          </div>
        </dl>
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
    </div>
  );
}
