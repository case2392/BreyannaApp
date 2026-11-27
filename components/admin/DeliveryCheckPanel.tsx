import { runDeliveryCheck, type CheckItem } from "@/lib/deliveryCheck";
import { shortDate } from "@/lib/format";
import { TestEmailButton } from "@/components/admin/TestEmailButton";
import { TestTextButton } from "@/components/admin/TestTextButton";

const ICON = { ok: "✓", warn: "!", bad: "✕" } as const;
const TONE = {
  ok: "bg-green-100 text-green-700",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-700",
} as const;

function Items({ items }: { items: CheckItem[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm text-ink-700">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${TONE[it.level]}`}
          >
            {ICON[it.level]}
          </span>
          <span>
            <span className="sr-only">
              {it.level === "ok" ? "OK: " : it.level === "warn" ? "Heads up: " : "Problem: "}
            </span>
            {it.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

// "Email & text setup" — what's working, what isn't, and how to fix it.
export async function DeliveryCheckPanel({ staffPhone }: { staffPhone: string | null }) {
  const c = await runDeliveryCheck();
  const emailBad = c.email.items.some((i) => i.level === "bad");
  const smsBad = c.sms.items.some((i) => i.level === "bad");
  const status = (bad: boolean, on: boolean) =>
    !on ? (
      <span className="badge bg-red-100 text-red-700">Not connected</span>
    ) : bad ? (
      <span className="badge bg-red-100 text-red-700">Needs attention</span>
    ) : (
      <span className="badge bg-green-100 text-green-700">Working</span>
    );

  return (
    <details className="card mb-6 p-5" open={emailBad || smsBad || c.recentFailures.length > 0}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Email &amp; text setup</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
            Email {status(emailBad, c.email.configured)}
            <span className="ml-2">Texting</span> {status(smsBad, c.sms.configured)}
          </div>
        </div>
      </summary>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Email
          </h3>
          <Items items={c.email.items} />
          {c.email.configured && (
            <div className="mt-3">
              <TestEmailButton />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Texting
          </h3>
          <Items items={c.sms.items} />
          {c.sms.configured ? (
            <div className="mt-3">
              <TestTextButton defaultPhone={staffPhone ?? ""} />
            </div>
          ) : (
            <details className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
              <summary className="cursor-pointer font-medium text-brand-700">
                How to turn on texting
              </summary>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li>
                  Create an account at <b>twilio.com</b> and add a payment method
                  (trial accounts can only text numbers you verify).
                </li>
                <li>
                  Buy a phone number that can send texts. Then register it for
                  business texting — Twilio walks you through it (“A2P 10DLC” for
                  a local number, or “toll-free verification” for an 8XX
                  number). Carriers block unregistered business texts, and
                  approval can take from a few days to a few weeks.
                </li>
                <li>
                  In Vercel → your project → Settings → Environment Variables,
                  add <code>TWILIO_ACCOUNT_SID</code>,{" "}
                  <code>TWILIO_AUTH_TOKEN</code> and <code>TWILIO_FROM_NUMBER</code>{" "}
                  (e.g. +14025551234), then redeploy.
                </li>
                <li>Come back here and send yourself a test text.</li>
              </ol>
            </details>
          )}
        </div>
      </div>

      {(c.skipped.sms > 0 || c.skipped.email > 0) && (
        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          In the last 30 days,{" "}
          {[
            c.skipped.sms > 0 && `${c.skipped.sms} text${c.skipped.sms === 1 ? "" : "s"}`,
            c.skipped.email > 0 && `${c.skipped.email} email${c.skipped.email === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" and ")}{" "}
          (campaigns and automations){" "}
          {c.skipped.sms + c.skipped.email === 1 ? "was" : "were"} logged but never
          actually sent, because that channel wasn&apos;t connected.
        </p>
      )}

      {c.recentFailures.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Failed sends in the last 30 days
          </h3>
          <ul className="mt-2 space-y-3">
            {c.recentFailures.map((f) => (
              <li key={`${f.channel}|${f.error}`} className="text-sm">
                <div className="text-ink-800">
                  <b>
                    {f.count} {f.channel === "SMS" ? "text" : "email"}
                    {f.count === 1 ? "" : "s"}
                  </b>{" "}
                  failed (latest {shortDate(f.lastAt)}):{" "}
                  <span className="text-red-600">{f.error}</span>
                </div>
                {f.hint && <p className="mt-0.5 text-xs text-ink-600">→ {f.hint}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
