"use client";

import { useState, useTransition } from "react";
import { sendTestText } from "@/app/actions/messaging";
import { deliveryHint } from "@/lib/deliveryHints";

// Send a test text to a number you choose (prefilled with your own) and show
// exactly what the provider said.
export function TestTextButton({ defaultPhone }: { defaultPhone: string }) {
  const [phone, setPhone] = useState(defaultPhone);
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; to?: string; error?: string } | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="test-text-phone">
          Phone number for the test text
        </label>
        <input
          id="test-text-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your cell number"
          className="input w-44"
        />
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={pending || !phone.trim()}
          onClick={() => start(async () => setRes(await sendTestText(phone)))}
        >
          {pending ? "Sending…" : "Send test text"}
        </button>
      </div>
      {res && (
        <div
          className={`mt-2 max-w-md rounded-lg px-3 py-2 text-xs ${
            res.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {res.ok ? (
            <>
              ✓ <b>Twilio accepted it</b> for {res.to}. If it doesn&apos;t arrive in
              a minute or two, carriers are likely blocking it until your number&apos;s
              business-texting registration is approved in Twilio.
            </>
          ) : (
            <>
              ✗ <b>Send failed:</b> {res.error}
              {deliveryHint(res.error) && (
                <span className="mt-1 block text-ink-700">{deliveryHint(res.error)}</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
