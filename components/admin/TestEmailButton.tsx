"use client";

import { useState, useTransition } from "react";
import { sendTestEmail } from "@/app/actions/messaging";

export function TestEmailButton() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<
    | null
    | {
        to: string;
        from: string;
        ok: boolean;
        simulated: boolean;
        error?: string;
      }
  >(null);

  return (
    <div>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={pending}
        onClick={() => start(async () => setRes(await sendTestEmail()))}
      >
        {pending ? "Sending…" : "Send test email"}
      </button>
      {res && (
        <div
          className={`mt-2 max-w-md rounded-lg px-3 py-2 text-xs ${
            res.simulated
              ? "bg-amber-50 text-amber-800"
              : res.ok
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {res.simulated ? (
            <>
              ⚠ <b>Simulated — nothing was actually sent.</b> No email key
              (RESEND_API_KEY) is set in production, so all emails are silently
              skipped. Add it in Vercel and redeploy.
            </>
          ) : res.ok ? (
            <>
              ✓ <b>Sent</b> to {res.to} from <code>{res.from}</code>. Check your
              inbox and spam. If it never arrives, your &ldquo;from&rdquo;
              domain likely isn&apos;t verified in Resend.
            </>
          ) : (
            <>
              ✗ <b>Send failed:</b> {res.error}
            </>
          )}
        </div>
      )}
    </div>
  );
}
