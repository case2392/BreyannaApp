import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fireAutomation } from "@/lib/automations";
import { dayLabel, timeLabel } from "@/lib/format";
import { studioNow } from "@/lib/time";

// Sends "class reminder" automations for classes happening tomorrow.
// Intended to be called once a day by Vercel Cron (see vercel.json).
//
// Auth: accepts either Vercel's "Authorization: Bearer <CRON_SECRET>" header,
// or a manual ?key=<CRON_SECRET|SETUP_KEY> for testing.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.SETUP_KEY;
  if (!secret) return false;
  const url = new URL(request.url);
  if (url.searchParams.get("key") === secret) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Tomorrow's window, in the studio's Central day.
  const start = studioNow();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "BOOKED",
      session: { cancelled: false, startsAt: { gte: start, lt: end } },
    },
    include: {
      user: true,
      session: { include: { classType: true } },
    },
  });

  let processed = 0;
  for (const b of bookings) {
    await fireAutomation(
      "class_reminder",
      b.user,
      {
        className: b.session.classType.name,
        date: dayLabel(b.session.startsAt),
        time: timeLabel(b.session.startsAt),
      },
      { classTypeId: b.session.classTypeId }
    );
    processed++;
  }

  return NextResponse.json({ ok: true, remindersProcessed: processed });
}
