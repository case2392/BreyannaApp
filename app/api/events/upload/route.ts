import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issues a short-lived token so the CRM can upload an event image directly from
// the browser to Blob storage (bypassing the server request-size limit).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user || !isStaff(user.role)) throw new Error("Not authorized.");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 20 * 1024 * 1024, // 20 MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // The browser receives the blob URL directly; nothing to do here.
      },
    });
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Upload failed." },
      { status: 400 }
    );
  }
}
