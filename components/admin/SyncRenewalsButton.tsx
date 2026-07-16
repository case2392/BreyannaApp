"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncSubscriptionsFromStripe } from "@/app/actions/admin";

export function SyncRenewalsButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    if (
      !confirm(
        "Pull every membership's renewal date from Stripe and update the CRM to match?"
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const res = await syncSubscriptionsFromStripe();
      if (!res.ok) {
        setMsg(res.error ?? "Sync failed.");
        return;
      }
      setMsg(
        `Synced ${res.updated}/${res.checked} subscriptions with Stripe` +
          (res.errors ? ` · ${res.errors} couldn't be read` : "") +
          "."
      );
      router.refresh();
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="btn-secondary text-sm"
      >
        {pending ? "Syncing…" : "Sync renewal dates from Stripe"}
      </button>
      {msg && <p className="mt-1 text-xs text-ink-500">{msg}</p>}
    </div>
  );
}
