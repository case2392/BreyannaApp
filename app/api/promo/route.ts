import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { studioNow } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the active promo popup (if any) for the site-wide popup to show.
export async function GET() {
  try {
    const promo = await prisma.promo.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!promo || !promo.imageUrl) return NextResponse.json({ promo: null });
    if (promo.endsAt && promo.endsAt.getTime() <= studioNow().getTime())
      return NextResponse.json({ promo: null });
    return NextResponse.json({
      promo: {
        id: promo.id,
        imageUrl: promo.imageUrl,
        alt: promo.alt,
        linkUrl: promo.linkUrl,
      },
    });
  } catch {
    return NextResponse.json({ promo: null });
  }
}
