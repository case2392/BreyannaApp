"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkStripeSubscription } from "@/app/actions/admin";

export function LinkSubscription({
  userId,
  plans,
}: {
  userId: string;
  plans: { id: string; name: string }[];
}) {
  const [subId, setSubId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await linkStripeSubscription(userId, subId, planId);
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({
        ok: true,
        text: "Linked ✓ Renewals and status will now sync automatically.",
      });
      setSubId("");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-1 text-sm font-medium">Link a Stripe subscription</div>
      <p className="mb-3 text-xs text-ink-500">
        For a member who subscribed in Stripe before the site was live. Paste
        their subscription ID and choose the plan.
      </p>
      <div className="space-y-2">
        <input
          className="input"
          placeholder="Stripe subscription ID (sub_…)"
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
        />
        <select
          className="input"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="btn-primary text-sm"
          disabled={pending || !subId.trim() || !planId}
          onClick={submit}
        >
          {pending ? "Linking…" : "Link subscription"}
        </button>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${
            msg.ok ? "text-green-700" : "text-red-600"
          }`}
        >
          {msg.text}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-400">
        Find the ID in Stripe → Customers → the member → their subscription
        (starts with &ldquo;sub_&rdquo;).
      </p>
    </div>
  );
}
