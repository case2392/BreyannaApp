"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerForEvent } from "@/app/actions/events";

export function EventRegisterButton({
  eventId,
  priceLabel,
  authed,
}: {
  eventId: string;
  priceLabel: string;
  authed: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function go() {
    setError(null);
    if (!authed) {
      router.push(`/login?next=/events/${eventId}`);
      return;
    }
    start(async () => {
      const res = await registerForEvent(eventId);
      if (!res.ok) {
        if ((res as any).needAuth) {
          router.push(`/login?next=/events/${eventId}`);
          return;
        }
        setError(res.error ?? "Something went wrong.");
        return;
      }
      if ((res as any).url) {
        window.location.href = (res as any).url; // Stripe checkout
      } else {
        router.refresh(); // free / instant registration
      }
    });
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={pending}
        className="btn-primary w-full px-6 py-3 text-base"
      >
        {pending
          ? "One moment…"
          : priceLabel === "Free"
          ? "Register — it's free"
          : `Register · ${priceLabel}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
