"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckout, openBillingPortal } from "@/app/actions/checkout";

export function BuyButton({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function buy() {
    setError(null);
    startTransition(async () => {
      const res = await startCheckout(planId);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      if (res.url) {
        // Real Stripe checkout — send the member to the secure payment page.
        window.location.href = res.url;
      } else {
        // Instant-grant fallback (Stripe not configured yet).
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button onClick={buy} disabled={pending} className="btn-primary w-full">
        {pending ? "One moment…" : "Get this plan"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const res = await openBillingPortal();
      if (res.ok && res.url) window.location.href = res.url;
      else setError(res.error ?? "Unavailable.");
    });
  }

  return (
    <div>
      <button onClick={open} disabled={pending} className="btn-secondary text-sm">
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
