"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { resolveAudience } from "@/lib/audiences";
import { sendEmail, sendSms } from "@/lib/messaging";
import {
  AUTOMATIONS,
  TRIGGER_KEYS,
  ensureAutomations,
  automationDef,
} from "@/lib/automations";
import { randomUUID } from "crypto";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) throw new Error("Not authorized");
  return user;
}

// Run async work over a list in small concurrent batches.
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

export async function sendCampaign(_prev: unknown, formData: FormData) {
  const staff = await requireStaff();

  const channel = String(formData.get("channel") || "EMAIL") as "EMAIL" | "SMS";
  const audience = String(formData.get("audience") || "all");
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!body) return { error: "Please write a message." };
  if (channel === "EMAIL" && !subject)
    return { error: "Please add a subject line for emails." };

  // The composer always submits the exact checked recipient ids (a segment can
  // be picked, then individuals unchecked). Fall back to resolving the segment
  // server-side only if no explicit list was sent.
  const ids = String(formData.get("memberIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let recipients;
  if (ids.length > 0) {
    const found = await prisma.user.findMany({
      where: { id: { in: ids }, role: "MEMBER" },
    });
    // Preserve the submitted order.
    const pos = new Map(ids.map((id, i) => [id, i]));
    recipients = found.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
  } else {
    recipients = await resolveAudience(audience);
  }

  if (recipients.length === 0)
    return { error: "Please choose at least one person to message." };

  const reachable = recipients.filter((r) =>
    channel === "EMAIL" ? Boolean(r.email) : Boolean(r.phone)
  );

  if (reachable.length === 0) {
    return {
      error:
        channel === "EMAIL"
          ? "No members in this audience have an email address."
          : "No members in this audience have a phone number.",
    };
  }

  const campaign = await prisma.campaign.create({
    data: {
      channel,
      subject: channel === "EMAIL" ? subject : null,
      body,
      audience,
      status: "DRAFT",
      recipientCount: reachable.length,
    },
  });

  let sent = 0;
  let failed = 0;
  let simulatedAny = false;

  await inBatches(reachable, 8, async (r) => {
    const to = channel === "EMAIL" ? r.email : r.phone!;
    const result =
      channel === "EMAIL"
        ? await sendEmail(to, subject, body)
        : await sendSms(to, body);
    if (result.simulated) simulatedAny = true;
    if (result.ok) sent++;
    else failed++;
    await prisma.messageLog.create({
      data: {
        campaignId: campaign.id,
        userId: r.id,
        channel,
        to,
        kind: "campaign",
        status: result.simulated ? "SIMULATED" : result.ok ? "SENT" : "FAILED",
        error: result.error,
      },
    });
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: failed > 0 && sent === 0 ? "FAILED" : "SENT",
      sentCount: sent,
      failedCount: failed,
      simulated: simulatedAny,
      sentAt: new Date(),
      createdById: staff.id,
    },
  });

  revalidatePath("/admin/messages");
  return {
    ok: true,
    sent,
    failed,
    simulated: simulatedAny,
    total: reachable.length,
  };
}

// Send a test email to the signed-in staff member and report exactly what
// happened, so email delivery can be diagnosed from inside the CRM.
export async function sendTestEmail() {
  const staff = await requireStaff();
  const from = process.env.RESEND_FROM || "onboarding@resend.dev (Resend default)";
  const result = await sendEmail(
    staff.email,
    "Dwell Studio — test email ✅",
    "This is a test from your Dwell Studio CRM.\n\nIf you're reading this, email delivery is working. If you never receive it, the send failed — check the on-screen result in the CRM."
  );
  return {
    to: staff.email,
    from,
    replyToConfigured: Boolean(process.env.RESEND_REPLY_TO),
    ...result,
  };
}

// Update an existing automation (built-in default or a custom one), keyed by
// its unique `key`.
export async function saveAutomation(_prev: unknown, formData: FormData) {
  await requireStaff();
  await ensureAutomations();

  const key = String(formData.get("key") || "");
  const existing = await prisma.automation.findUnique({ where: { key } });
  if (!existing) return { error: "That automation no longer exists." };

  const enabled = formData.get("enabled") === "on";
  const channel = String(formData.get("channel") || "EMAIL") as
    | "EMAIL"
    | "SMS"
    | "BOTH";
  const subject = String(formData.get("subject") || "").trim();
  const template = String(formData.get("template") || "").trim();

  if (!template) return { error: "The message template can't be empty." };

  await prisma.automation.update({
    where: { key },
    data: { enabled, channel, subject: subject || null, template },
  });

  revalidatePath("/admin/automations");
  return { ok: true };
}

// Create a new automation for a trigger, optionally scoped to one class type.
export async function createAutomation(_prev: unknown, formData: FormData) {
  await requireStaff();
  await ensureAutomations();

  const trigger = String(formData.get("trigger") || "");
  const def = automationDef(trigger);
  if (!def) return { error: "Please choose a valid trigger." };

  const classTypeIdRaw = String(formData.get("classTypeId") || "").trim();
  const classTypeId = classTypeIdRaw || null;

  if (classTypeId && !def.supportsClassType) {
    return { error: "This automation can't be limited to a class type." };
  }
  if (classTypeId) {
    const ct = await prisma.classType.findUnique({ where: { id: classTypeId } });
    if (!ct) return { error: "That class type no longer exists." };
    // Only one custom automation per (trigger, class type) to keep it simple.
    const dupe = await prisma.automation.findFirst({
      where: { trigger, classTypeId },
    });
    if (dupe) {
      return {
        error: "There's already a version of this automation for that class.",
      };
    }
  }

  const channel = String(formData.get("channel") || "EMAIL") as
    | "EMAIL"
    | "SMS"
    | "BOTH";
  const name = String(formData.get("name") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const template = String(formData.get("template") || "").trim();

  if (!template) return { error: "The message template can't be empty." };

  await prisma.automation.create({
    data: {
      key: randomUUID(),
      trigger,
      name,
      classTypeId,
      channel,
      enabled: true,
      subject: subject || null,
      template,
    },
  });

  revalidatePath("/admin/automations");
  return { ok: true };
}

// Delete a custom automation. Built-in defaults (keyed by their trigger) can't
// be deleted — turn them off instead.
export async function deleteAutomation(key: string) {
  await requireStaff();
  if (TRIGGER_KEYS.includes(key)) {
    return { error: "You can turn the default off, but it can't be deleted." };
  }
  await prisma.automation.deleteMany({ where: { key } });
  revalidatePath("/admin/automations");
  return { ok: true };
}
