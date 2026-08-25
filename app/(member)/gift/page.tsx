import Link from "next/link";
import { prisma } from "@/lib/db";
import { dayLabel, timeLabel, money } from "@/lib/format";
import { studioNow } from "@/lib/time";
import { finalizeClassGift } from "@/app/actions/gift";
import { GiftClassForm } from "@/components/GiftClassForm";

export const dynamic = "force-dynamic";

export default async function GiftPage({
  searchParams,
}: {
  searchParams: { status?: string; session_id?: string };
}) {
  // Confirm a gift on return from Stripe (belt-and-suspenders vs the webhook).
  if (searchParams.session_id) {
    await finalizeClassGift(searchParams.session_id);
  }

  const now = studioNow();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 21);

  const [sessions, dropIn] = await Promise.all([
    prisma.classSession.findMany({
      where: {
        cancelled: false,
        registrationClosed: false,
        isPrivate: false,
        startsAt: { gte: now, lt: horizon },
      },
      orderBy: { startsAt: "asc" },
      include: {
        classType: { select: { name: true } },
        instructor: { select: { name: true } },
      },
      take: 100,
    }),
    prisma.membershipPlan.findFirst({
      where: { active: true, kind: "DROP_IN" },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  const classes = sessions.map((s) => ({
    id: s.id,
    label: `${dayLabel(s.startsAt)} · ${timeLabel(s.startsAt)} — ${
      s.classType.name
    } (${s.instructor.name})`,
  }));
  const priceLabel = dropIn ? money(dropIn.priceCents) : "single-class rate";

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Gift a class</h1>
      <p className="mb-6 text-sm text-ink-500">
        Treat a friend to a single class — pick the class, add their details, and
        pay the single-class rate.
      </p>

      {searchParams.status === "success" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Thank you! Your gift is confirmed and they&apos;re on the roster. Let
          them know so they can join.
        </div>
      )}
      {searchParams.status === "cancel" && (
        <div className="mb-6 rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-sm text-ink-700">
          Checkout cancelled — no charge was made.
        </div>
      )}

      {!dropIn && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Single-class gifting isn&apos;t set up yet — add a drop-in
          &ldquo;Single Class&rdquo; plan in the CRM first.
        </div>
      )}

      <GiftClassForm classes={classes} priceLabel={priceLabel} />

      <div className="mt-6 text-sm">
        <Link href="/schedule" className="text-brand-600">
          ← Back to schedule
        </Link>
      </div>
    </div>
  );
}
