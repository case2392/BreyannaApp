import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed-data";

// One-time setup endpoint for the deployed site.
//
// Visiting /api/setup?key=YOUR_SETUP_KEY loads the demo data so the live site
// has classes, members and bookings to explore. It is protected by the
// SETUP_KEY environment variable so strangers can't trigger it.
//
// By default it will NOT overwrite a database that already has data; pass
// &force=1 to wipe and reseed.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const force = url.searchParams.get("force") === "1";

  const expected = process.env.SETUP_KEY;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_KEY is not configured on the server." },
      { status: 500 }
    );
  }
  if (key !== expected) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing setup key." },
      { status: 401 }
    );
  }

  try {
    const existing = await prisma.user.count();
    if (existing > 0 && !force) {
      return NextResponse.json({
        ok: true,
        alreadyInitialized: true,
        message:
          "Database already has data. Add &force=1 to the URL to wipe and reload the demo data.",
      });
    }

    const summary = await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      message: "Demo data loaded. You can now sign in.",
      summary,
      logins: {
        owner: { email: "owner@demo.com", password: "password" },
        member: { email: "member@demo.com", password: "password" },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Setup failed." },
      { status: 500 }
    );
  }
}
