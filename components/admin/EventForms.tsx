"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/admin";

// Downscale + re-encode an image in the browser to a small JPEG, so uploads are
// fast and web-optimized regardless of the original photo's size.
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
      rej(
        new Error(
          "Couldn't read that image. Please use a JPG or PNG (iPhone HEIC photos aren't supported — take a screenshot instead)."
        )
      );
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

// Uploads an event image straight from the browser to Blob storage (no server
// size limit), and carries the resulting URL in a hidden `imageUrl` field.
function EventImageField({
  currentImage,
  onUploadingChange,
}: {
  currentImage?: string | null;
  onUploadingChange?: (busy: boolean) => void;
}) {
  const [imageUrl, setImageUrl] = useState(currentImage ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBusy(b: boolean) {
    setUploading(b);
    onUploadingChange?.(b);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const resized = await resizeToJpeg(file);
      const form = new FormData();
      form.append("file", new File([resized], "event.jpg", { type: "image/jpeg" }));
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
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="label">Event image</label>
      <input type="hidden" name="imageUrl" value={imageUrl} />
      {imageUrl && (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Event"
            className="h-16 w-24 rounded-lg object-cover"
          />
          <button
            type="button"
            className="text-xs font-medium text-red-600 hover:underline"
            onClick={() => setImageUrl("")}
          >
            Remove
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
          Uploading… please wait before saving.
        </p>
      )}
      {!uploading && imageUrl && (
        <p className="mt-1 text-xs font-medium text-green-600">
          ✓ Image ready — it&apos;ll save with the event.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input
        type="text"
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="…or paste an image URL"
        className="input mt-2"
      />
      <p className="mt-1 text-xs text-ink-400">
        JPG, PNG, WEBP, or GIF (up to 20MB). Shown on the public events page.
      </p>
    </div>
  );
}

function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary"
      disabled={pending || disabled}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {msg}
    </p>
  );
}

// Shared field layout for create + edit.
function EventFields({
  defaults,
  currentImage,
  onUploadingChange,
}: {
  defaults?: {
    name?: string;
    description?: string | null;
    location?: string | null;
    price?: string;
    date?: string;
    time?: string;
  };
  currentImage?: string | null;
  onUploadingChange?: (busy: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Event name</label>
        <input
          name="name"
          className="input"
          placeholder="e.g. Craft Night"
          defaultValue={defaults?.name}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input name="date" type="date" className="input" defaultValue={defaults?.date} />
        </div>
        <div>
          <label className="label">Time</label>
          <input name="time" type="time" className="input" defaultValue={defaults?.time} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Location</label>
          <input
            name="location"
            className="input"
            placeholder="e.g. The Studio"
            defaultValue={defaults?.location ?? ""}
          />
        </div>
        <div>
          <label className="label">Price ($)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            className="input"
            defaultValue={defaults?.price ?? "0"}
          />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          className="input min-h-[80px]"
          placeholder="What the event is, what to bring, etc."
          defaultValue={defaults?.description ?? ""}
        />
      </div>
      <EventImageField
        currentImage={currentImage}
        onUploadingChange={onUploadingChange}
      />
    </div>
  );
}

export function CreateEventForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [state, action] = useFormState(
    async (
      prev: unknown,
      fd: FormData
    ): Promise<{ error?: string; ok?: boolean }> => {
      const res = await createEvent(prev, fd);
      if ("ok" in res && res.ok) ref.current?.reset();
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  return (
    <form ref={ref} action={action} className="card p-5">
      <h3 className="mb-4 font-semibold">New event</h3>
      <Err msg={state?.error} />
      <EventFields onUploadingChange={setUploading} />
      <div className="mt-4">
        <Submit label="Create event" disabled={uploading} />
      </div>
    </form>
  );
}

type EventRowData = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  priceCents: number;
  active: boolean;
  whenLabel: string;
  priceLabel: string;
  date: string;
  time: string;
  price: string;
  imageUrl: string | null;
  registrationCount: number;
};

export function EventRow({ event }: { event: EventRowData }) {
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();
  const [state, action] = useFormState(
    async (
      prev: unknown,
      fd: FormData
    ): Promise<{ error?: string; ok?: boolean }> => {
      const res = await updateEvent(prev, fd);
      if ("ok" in res && res.ok) setEditing(false);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  function onDelete() {
    if (!confirm(`Delete "${event.name}"? This can't be undone.`)) return;
    startDelete(async () => {
      await deleteEvent(event.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <form action={action} className="card p-5">
        <input type="hidden" name="id" value={event.id} />
        <Err msg={state?.error} />
        <EventFields
          currentImage={event.imageUrl}
          onUploadingChange={setUploading}
          defaults={{
            name: event.name,
            description: event.description,
            location: event.location,
            price: event.price,
            date: event.date,
            time: event.time,
          }}
        />
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={event.active} />
          <span className="text-sm text-ink-700">Active (visible on lists)</span>
        </label>
        <div className="mt-4 flex gap-2">
          <Submit label="Save" disabled={uploading} />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.name}
            className="h-16 w-24 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{event.name}</span>
            {!event.active && (
              <span className="badge bg-ink-100 text-ink-500">Hidden</span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-ink-500">
            {event.whenLabel}
            {event.location ? ` · ${event.location}` : ""} · {event.priceLabel}
          </div>
          {event.description && (
            <p className="mt-2 line-clamp-2 text-sm text-ink-600">
              {event.description}
            </p>
          )}
          <div className="mt-2">
            <Link
              href={`/admin/events/${event.id}`}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              {event.registrationCount} registered · View roster →
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            className="btn-ghost text-xs text-red-600 hover:bg-red-50"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
