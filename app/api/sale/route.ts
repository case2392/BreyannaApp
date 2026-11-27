import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { currentSaleBanner } from "@/lib/saleBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The live sale banner (if any) for the site-wide banner to show.
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ banner: await currentSaleBanner(Boolean(user)) });
  } catch {
    return NextResponse.json({ banner: null });
  }
}
