import Link from "next/link";
import { prisma } from "@/lib/db";
import { AUDIENCES, audienceMemberIds, audienceLabel } from "@/lib/audiences";
import { emailConfigured, smsConfigured } from "@/lib/messaging";
import { shortDate, timeLabel } from "@/lib/format";
import { ComposeCampaign } from "@/components/admin/ComposeCampaign";
import { BoltIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const [audienceMembers, campaigns, members] = await Promise.all([
    audienceMemberIds(),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    }),
  ]);

  const audiences = AUDIENCES.map((a) => ({
    key: a.key,
    label: a.label,
    group: a.group,
    count: (audienceMembers[a.key] ?? []).length,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-ink-500">
            Send email & text campaigns to your members.
          </p>
        </div>
        <Link href="/admin/automations" className="btn-secondary text-sm">
          <BoltIcon className="h-4 w-4" /> Automations
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div>
          <h2 className="mb-3 font-semibold">New campaign</h2>
          <ComposeCampaign
            audiences={audiences}
            members={members}
            audienceMembers={audienceMembers}
            emailReady={emailConfigured()}
            smsReady={smsConfigured()}
          />
        </div>

        {/* History */}
        <div>
          <h2 className="mb-3 font-semibold">Sent campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-500">
              No campaigns yet. Send your first one!
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge bg-ink-100 text-ink-700">
                      {c.channel === "EMAIL" ? "Email" : "Text"}
                    </span>
                    <span className="text-xs text-ink-400">
                      {shortDate(c.createdAt)} · {timeLabel(c.createdAt)}
                    </span>
                  </div>
                  {c.subject && (
                    <div className="mt-2 truncate font-medium">{c.subject}</div>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>To: {audienceLabel(c.audience)}</span>
                    <span>·</span>
                    <span className="font-medium text-ink-700">
                      {c.sentCount}/{c.recipientCount} delivered
                    </span>
                    {c.failedCount > 0 && (
                      <span className="text-red-600">{c.failedCount} failed</span>
                    )}
                    {c.simulated && (
                      <span className="badge bg-amber-100 text-amber-700">
                        Simulated
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
