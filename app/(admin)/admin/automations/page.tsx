import Link from "next/link";
import { prisma } from "@/lib/db";
import { AUTOMATIONS, ensureAutomations } from "@/lib/automations";
import { emailConfigured, smsConfigured } from "@/lib/messaging";
import { AutomationCard } from "@/components/admin/AutomationCard";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  await ensureAutomations();
  const rows = await prisma.automation.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const emailReady = emailConfigured();
  const smsReady = smsConfigured();

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/messages" className="text-sm text-brand-600">
          ← Back to messages
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Automations</h1>
      <p className="mb-6 text-sm text-ink-500">
        Automatically send messages when something happens. Toggle one on to
        activate it.
      </p>

      {(!emailReady || !smsReady) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo mode — {!emailReady && "email"}
          {!emailReady && !smsReady && " and "}
          {!smsReady && "SMS"} delivery isn&apos;t configured yet, so enabled
          automations are logged but not actually sent. Add the provider keys to
          go live.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {AUTOMATIONS.map((a) => {
          const row = byKey.get(a.key);
          return (
            <AutomationCard
              key={a.key}
              apiKey={a.key}
              label={a.label}
              description={a.description}
              vars={a.vars}
              enabled={row?.enabled ?? false}
              channel={row?.channel ?? a.defaultChannel}
              subject={row?.subject ?? a.defaultSubject}
              template={row?.template ?? a.defaultTemplate}
            />
          );
        })}
      </div>
    </div>
  );
}
