import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

// Image uploads use Vercel Blob storage. It's active once a Blob store is
// created in the Vercel project (which provisions BLOB_READ_WRITE_TOKEN).
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Upload an image file to Blob storage and return its public URL.
export async function uploadImage(file: File, folder = "events"): Promise<string> {
  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const blob = await put(`${folder}/${randomUUID()}.${ext}`, file, {
    access: "public",
  });
  return blob.url;
}
