import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedDatabase, cleanStudio } from "@/lib/seed-data";

// Setup endpoint for the deployed site. Protected by the SETUP_KEY env var.
//
//   /api/setup?key=KEY               → load demo data (only if DB is empty)
//   /api/setup?key=KEY&force=1       → wipe & reload demo data
//   /api/setup?key=KEY&mode=clean    → prepare for real use: remove demo
//                                      members/bookings/classes, keep the
//                                      catalog (class types, plans, staff)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const force = url.searchParams.get("force") === "1";
  const mode = url.searchParams.get("mode");

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
    // Clean-start: strip demo members/bookings/sessions, keep the catalog.
    if (mode === "clean") {
      const result = await cleanStudio(prisma);
      return NextResponse.json({
        ok: true,
        mode: "clean",
        message:
          "Studio cleared for real use. Demo members, bookings and classes were removed; your class types, plans and staff were kept.",
        signIn: result.ownerCreated
          ? { email: result.ownerEmail, password: "password", note: "Change this password after signing in." }
          : { email: result.ownerEmail, note: "Use your existing owner password." },
      });
    }

    const existing = await prisma.user.count();
    if (existing > 0 && !force) {
      return NextResponse.json({
        ok: true,
        alreadyInitialized: true,
        message:
          "Database already has data. Add &force=1 to reload demo data, or &mode=clean to prepare for real use.",
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
