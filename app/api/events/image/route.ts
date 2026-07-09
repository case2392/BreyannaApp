import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Publicly serves an event image from the private Blob store, so it can be
// shown on the site without the store being public. Only serves items under the
// events/ prefix.
export async function GET(request: Request): Promise<Response> {
  const pathname = new URL(request.url).searchParams.get("p");
  if (!pathname || !pathname.startsWith("events/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(result.stream as unknown as BodyInit, {
      headers: {
        "Content-Type": result.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
