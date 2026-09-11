"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyEventRegistration } from "@/app/actions/events";

// Lets a member cancel their own free/credit event registration (credits are
// refunded). Paid tickets are handled by the studio.
export function CancelMyEventRegistration({
  registrationId,
}: {
  registrationId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    if (!confirm("Cancel your registration? Any credit used is refunded."))
      return;
    setError(null);
    start(async () => {
      const res = await cancelMyEventRegistration(registrationId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="text-center">
      <button
        onClick={cancel}
        disabled={pending}
        className="text-xs font-medium text-ink-500 hover:text-red-600"
      >
        {pending ? "Cancelling…" : "Cancel my registration"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
