"use client";

import { useState, useTransition } from "react";
import { purchasePlan } from "@/app/actions/member";

export function BuyButton({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function buy() {
    setError(null);
    startTransition(async () => {
      const res = await purchasePlan(planId);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div>
      <button onClick={buy} disabled={pending} className="btn-primary w-full">
        {pending ? "Processing…" : "Get this plan"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
