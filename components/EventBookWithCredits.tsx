"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookEventWithCredits } from "@/app/actions/events";

// Register for an event using the member's membership/credits.
export function EventBookWithCredits({
  eventId,
  creditCost,
}: {
  eventId: string;
  creditCost: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function book() {
    setError(null);
    start(async () => {
      const res = await bookEventWithCredits(eventId);
      if (!res.ok) {
        if ("needAuth" in res && res.needAuth) {
          router.push(`/login?next=/events/${eventId}`);
          return;
        }
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button onClick={book} disabled={pending} className="btn-primary w-full">
        {pending ? "Booking…" : "Book with my membership"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-500">
        Uses your membership — {creditCost} credit{creditCost === 1 ? "" : "s"}{" "}
        (free on unlimited plans).
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
