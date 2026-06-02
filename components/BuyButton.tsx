"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startCheckout,
  openBillingPortal,
  cancelMembership,
} from "@/app/actions/checkout";

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

export function CancelPlanButton({ membershipId }: { membershipId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function cancel() {
    if (!confirm("Cancel this membership? This removes access right away."))
      return;
    startTransition(async () => {
      await cancelMembership(membershipId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
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
