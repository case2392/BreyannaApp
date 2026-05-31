"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { resolveAudience } from "@/lib/audiences";
import { sendEmail, sendSms } from "@/lib/messaging";
import { AUTOMATIONS, ensureAutomations } from "@/lib/automations";

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

  const recipients = await resolveAudience(audience);
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

export async function saveAutomation(_prev: unknown, formData: FormData) {
  await requireStaff();
  await ensureAutomations();

  const key = String(formData.get("key") || "");
  if (!AUTOMATIONS.some((a) => a.key === key))
    return { error: "Unknown automation." };

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
