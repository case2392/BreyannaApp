import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser, isStaff } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Receives an already-resized (small) image from the CRM and stores it in Blob.
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage isn't connected yet (BLOB_READ_WRITE_TOKEN is missing). Add a Blob store in Vercel and redeploy.",
      },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  try {
    const blob = await put(`events/${randomUUID()}.jpg`, file, {
      access: "public",
      contentType: "image/jpeg",
    });
    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed." },
      { status: 500 }
    );
  }
}
