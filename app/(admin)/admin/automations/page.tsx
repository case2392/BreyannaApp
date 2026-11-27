import Link from "next/link";
import { prisma } from "@/lib/db";
import { AUTOMATIONS, ensureAutomations } from "@/lib/automations";
import { emailConfigured, smsConfigured } from "@/lib/messaging";
import { AutomationCard } from "@/components/admin/AutomationCard";
import { CreateAutomationForm } from "@/components/admin/CreateAutomationForm";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  await ensureAutomations();

  const [rows, classTypes] = await Promise.all([
    prisma.automation.findMany({ include: { classType: true } }),
    prisma.classType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

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
        Automatically send messages when something happens. Edit the default,
        toggle it on, or add a special version for a specific class type.
      </p>

      {(!emailReady || !smsReady) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>
            {!emailReady && "Email"}
            {!emailReady && !smsReady && " and "}
            {!smsReady && "Texting"} isn&apos;t connected yet
          </b>
          , so automations set to {!emailReady && !smsReady ? "email or text" : !emailReady ? "email" : "text"}{" "}
          are skipped — nobody receives them. Choose{" "}
          {!smsReady && emailReady ? "Email" : "a connected channel"} for now, or
          see “Email &amp; text setup” on the Messages page to connect it.
        </div>
      )}

      <div className="space-y-8">
        {AUTOMATIONS.map((def) => {
          const defaultRow = rows.find((r) => r.key === def.key);
          const custom = rows
            .filter((r) => r.trigger === def.key && r.key !== def.key)
            .sort((a, b) =>
              (a.classType?.name ?? "").localeCompare(b.classType?.name ?? "")
            );

          const defaultScope = def.supportsClassType ? "All classes" : "Everyone";

          return (
            <section key={def.key}>
              <div className="mb-3">
                <h2 className="text-lg font-semibold">{def.label}</h2>
                <p className="text-sm text-ink-500">{def.description}</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {defaultRow && (
                  <AutomationCard
                    apiKey={defaultRow.key}
                    scopeLabel={defaultScope}
                    vars={def.vars}
                    enabled={defaultRow.enabled}
                    channel={defaultRow.channel}
                    subject={defaultRow.subject ?? ""}
                    template={defaultRow.template}
                    canDelete={false}
                  />
                )}
                {custom.map((r) => (
                  <AutomationCard
                    key={r.key}
                    apiKey={r.key}
                    scopeLabel={
                      r.classType ? `Only ${r.classType.name}` : "All classes"
                    }
                    vars={def.vars}
                    enabled={r.enabled}
                    channel={r.channel}
                    subject={r.subject ?? ""}
                    template={r.template}
                    canDelete
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 max-w-xl">
        <CreateAutomationForm
          triggers={AUTOMATIONS.map((a) => ({
            key: a.key,
            label: a.label,
            defaultChannel: a.defaultChannel,
            defaultSubject: a.defaultSubject,
            defaultTemplate: a.defaultTemplate,
            vars: a.vars,
            supportsClassType: a.supportsClassType,
          }))}
          classTypes={classTypes}
        />
      </div>
    </div>
  );
}
