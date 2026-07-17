"use client";

import { useState, useTransition } from "react";
import { book, unbook } from "@/app/actions/member";

type Props = {
  sessionId: string;
  bookingId?: string;
  myStatus?: "BOOKED" | "WAITLISTED" | null;
  isFull: boolean;
  started: boolean;
  closed?: boolean;
};

export function BookButton({
  sessionId,
  bookingId,
  myStatus,
  isFull,
  started,
  closed,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doBook() {
    setError(null);
    startTransition(async () => {
      const res = await book(sessionId);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  function doCancel() {
    if (!bookingId) return;
    setError(null);
    startTransition(async () => {
      const res = await unbook(bookingId);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  if (started) {
    return <span className="text-xs text-ink-500">Closed</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Booked/waitlisted members can still leave, even once booking closes. */}
      {myStatus === "BOOKED" && (
        <button onClick={doCancel} disabled={pending} className="btn-secondary text-xs">
          {pending ? "…" : "Cancel"}
        </button>
      )}
      {myStatus === "WAITLISTED" && (
        <button onClick={doCancel} disabled={pending} className="btn-secondary text-xs">
          {pending ? "…" : "Leave waitlist"}
        </button>
      )}
      {!myStatus && closed && (
        <span className="text-xs text-ink-500">Registration closed</span>
      )}
      {!myStatus && !closed && !isFull && (
        <button onClick={doBook} disabled={pending} className="btn-primary text-xs">
          {pending ? "…" : "Book"}
        </button>
      )}
      {!myStatus && !closed && isFull && (
        <button onClick={doBook} disabled={pending} className="btn-secondary text-xs">
          {pending ? "…" : "Join waitlist"}
        </button>
      )}
      {error && <span className="max-w-[10rem] text-right text-xs text-red-600">{error}</span>}
    </div>
  );
}
