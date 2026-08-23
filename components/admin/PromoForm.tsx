"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { savePromo } from "@/app/actions/admin";

// Downscale + re-encode in the browser to a web-friendly JPEG before upload.
async function resizeToJpeg(file: File, maxDim = 1600, quality = 0.85): Promise<Blob> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () =>
      rej(new Error("Couldn't read that image. Please use a JPG or PNG."));
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing failed.");
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Image processing failed."))),
      "image/jpeg",
      quality
    )
  );
}

function Submit({ uploading }: { uploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary"
      disabled={pending || uploading}
    >
      {pending ? "Saving…" : "Save popup"}
    </button>
  );
}

export function PromoForm({
  current,
}: {
  current: {
    imageUrl: string;
    linkUrl: string;
    endsAt: string; // YYYY-MM-DD or ""
    active: boolean;
  };
}) {
  const [state, action] = useFormState(savePromo, {} as { error?: string; ok?: boolean });
  const [imageUrl, setImageUrl] = useState(current.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const resized = await resizeToJpeg(file);
      const form = new FormData();
      form.append("file", new File([resized], "promo.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/events/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setImageUrl(data.url);
    } catch (err: any) {
      setError(
        err?.name === "AbortError"
          ? "Upload timed out. Check your connection and try again."
          : err?.message ?? "Upload failed. Please try a JPG or PNG."
      );
    } finally {
      clearTimeout(timeout);
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved ✓
        </p>
      )}

      <div>
        <label className="label">Popup image (the flyer)</label>
        <input type="hidden" name="imageUrl" value={imageUrl} />
        {imageUrl && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Popup preview"
              className="max-h-64 w-auto rounded-lg border border-ink-200"
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Remove image
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          disabled={uploading}
          className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
        />
        {uploading && (
          <p className="mt-1 text-xs font-medium text-brand-600">
            Uploading… wait before saving.
          </p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Show until (end of this day)</label>
          <input
            type="date"
            name="endsAt"
            defaultValue={current.endsAt}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-400">
            Leave blank for no end date.
          </p>
        </div>
        <div>
          <label className="label">Link when tapped (optional)</label>
          <input
            type="text"
            name="linkUrl"
            defaultValue={current.linkUrl}
            placeholder="/events/…  or a full URL"
            className="input"
          />
          <p className="mt-1 text-xs text-ink-400">
            Leave blank to just show the image.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={current.active} />
        <span className="font-medium">Show the popup now</span>
      </label>

      <Submit uploading={uploading} />
    </form>
  );
}
