import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { shortDate, timeLabel } from "@/lib/format";
import { audienceLabel } from "@/lib/audiences";
import { CopyEmailsButton } from "@/components/admin/CopyEmailsButton";

export const dynamic = "force-dynamic";

// Turn a raw provider error into a short plain-language hint.
function errorHint(error: string | null): string | null {
  if (!error) return null;
  if (/\b429\b|rate limit|too many/i.test(error))
    return "Sending too fast (provider rate limit). The new batch sender should fix this — try resending.";
  if (/\b403\b|testing emails|not verified|verify a domain/i.test(error))
    return "The sending domain isn't verified yet, so the provider only allows sending to your own address. Verify your domain in Resend.";
  if (/\b422\b|invalid|not a valid/i.test(error))
    return "The email address looks invalid.";
  return null;
}

export default async function CampaignResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { logs: { orderBy: { to: "asc" } } },
  });
  if (!campaign) notFound();

  const delivered = campaign.logs.filter(
    (l) => l.status === "SENT" || l.status === "SIMULATED"
  );
  const failed = campaign.logs.filter((l) => l.status === "FAILED");

  // Group failures by error so the reason is obvious at a glance.
  const byError = new Map<string, typeof failed>();
  for (const f of failed) {
    const key = f.error ?? "Unknown error";
    const arr = byError.get(key);
    if (arr) arr.push(f);
    else byError.set(key, [f]);
  }

  return (
    <div>
      <Link href="/admin/messages" className="text-sm text-brand-600">
        ← Back to messages
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {campaign.subject || (campaign.channel === "EMAIL" ? "Email campaign" : "Text campaign")}
      </h1>
      <p className="mb-6 text-sm text-ink-500">
        {campaign.channel === "EMAIL" ? "Email" : "Text"} ·{" "}
        {shortDate(campaign.createdAt)} · {timeLabel(campaign.createdAt)} · To{" "}
        {audienceLabel(campaign.audience)}
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-ink-500">Recipients</div>
          <div className="text-2xl font-bold">{campaign.recipientCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Delivered</div>
          <div className="text-2xl font-bold text-green-700">{delivered.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-500">Failed</div>
          <div className="text-2xl font-bold text-red-600">{failed.length}</div>
        </div>
      </div>

      {campaign.simulated && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This was sent in simulation mode (no email provider key configured), so
          nothing was actually delivered.
        </div>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-red-700">
              Failed ({failed.length})
            </h2>
            <CopyEmailsButton
              emails={failed.map((f) => f.to)}
              label="Copy failed emails"
            />
          </div>
          <div className="space-y-4">
            {[...byError.entries()].map(([error, group]) => {
              const hint = errorHint(error);
              return (
                <div key={error}>
                  <div className="text-sm font-medium">
                    {group.length} failed — <span className="text-red-600">{error}</span>
                  </div>
                  {hint && (
                    <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
                  )}
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
                    {group.map((f) => (
                      <li key={f.id}>{f.to}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivered */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-green-700">
            Delivered ({delivered.length})
          </h2>
          {delivered.length > 0 && (
            <CopyEmailsButton
              emails={delivered.map((d) => d.to)}
              label="Copy delivered emails"
            />
          )}
        </div>
        {delivered.length === 0 ? (
          <p className="text-sm text-ink-500">No one was reached.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
            {delivered.map((d) => (
              <li key={d.id}>{d.to}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
