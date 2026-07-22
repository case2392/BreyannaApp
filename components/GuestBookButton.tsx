"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bringGuest } from "@/app/actions/member";

export function GuestBookButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(fd: FormData) {
    setError(null);
    start(async () => {
      const res = await bringGuest(sessionId, {
        firstName: String(fd.get("firstName") || ""),
        lastName: String(fd.get("lastName") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || "") || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[11px] font-medium text-brand-600 hover:underline"
      >
        + Bring a guest
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="mt-2 space-y-1.5 rounded-lg border border-ink-200 bg-ink-50 p-2"
    >
      <div className="grid grid-cols-2 gap-1.5">
        <input
          name="firstName"
          placeholder="First name"
          className="input px-2 py-1 text-xs"
          required
        />
        <input
          name="lastName"
          placeholder="Last name"
          className="input px-2 py-1 text-xs"
          required
        />
      </div>
      <input
        name="phone"
        type="tel"
        placeholder="Phone"
        className="input px-2 py-1 text-xs"
        required
      />
      <input
        name="email"
        type="email"
        placeholder="Email (optional)"
        className="input px-2 py-1 text-xs"
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-2 py-1 text-[11px]"
        >
          {pending ? "Adding…" : "Add guest"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost px-2 py-1 text-[11px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
