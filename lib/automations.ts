import { prisma } from "./db";
import { sendEmail, sendSms, renderTemplate } from "./messaging";
import type { User } from "@prisma/client";

export type AutomationKey =
  | "welcome"
  | "booking_confirmation"
  | "waitlist_promotion"
  | "class_reminder";

type Def = {
  key: AutomationKey;
  label: string;
  description: string;
  defaultChannel: "EMAIL" | "SMS" | "BOTH";
  defaultSubject: string;
  defaultTemplate: string;
  vars: string[];
  // Whether this event happens in the context of a class, so it can have
  // class-type-specific versions.
  supportsClassType: boolean;
};

// The available automation triggers and their default copy. Each trigger has a
// built-in default (applies to all classes); staff can also add class-type
// specific versions that override the default for that class.
export const AUTOMATIONS: Def[] = [
  {
    key: "welcome",
    label: "Welcome message",
    description: "Sent when a new member creates an account.",
    defaultChannel: "EMAIL",
    defaultSubject: "Welcome to Dwell Studio 🤍",
    defaultTemplate:
      "Hi {{firstName}}, welcome to Dwell Studio! We're so glad you're here. Browse the schedule and book your first class anytime. See you soon!",
    vars: ["firstName"],
    supportsClassType: false,
  },
  {
    key: "booking_confirmation",
    label: "Booking confirmation",
    description: "Sent when a member books a class.",
    defaultChannel: "EMAIL",
    defaultSubject: "You're booked! {{className}}",
    defaultTemplate:
      "Hi {{firstName}}, you're booked for {{className}} on {{date}} at {{time}} with {{instructor}}. Can't make it? Cancel from the app so someone on the waitlist can join.",
    vars: ["firstName", "className", "date", "time", "instructor"],
    supportsClassType: true,
  },
  {
    key: "waitlist_promotion",
    label: "Waitlist spot opened",
    description: "Sent when a member moves off the waitlist into a class.",
    defaultChannel: "BOTH",
    defaultSubject: "A spot opened up! {{className}}",
    defaultTemplate:
      "Good news {{firstName}}! A spot opened in {{className}} on {{date}} at {{time}} and you're in. See you there!",
    vars: ["firstName", "className", "date", "time"],
    supportsClassType: true,
  },
  {
    key: "class_reminder",
    label: "Class reminder",
    description:
      "Sent the day before a member's class (requires the daily reminder job).",
    defaultChannel: "EMAIL",
    defaultSubject: "See you tomorrow at Dwell ✨",
    defaultTemplate:
      "Hi {{firstName}}, reminder: you have {{className}} tomorrow at {{time}}. We can't wait to move with you!",
    vars: ["firstName", "className", "date", "time"],
    supportsClassType: true,
  },
];

export const TRIGGER_KEYS = AUTOMATIONS.map((a) => a.key) as string[];

export function automationDef(trigger: string): Def | undefined {
  return AUTOMATIONS.find((a) => a.key === trigger);
}

// Make sure a built-in default row exists for every trigger (seeded as disabled
// by default). Also backfills the `trigger` field on legacy rows.
export async function ensureAutomations() {
  for (const a of AUTOMATIONS) {
    await prisma.automation.upsert({
      where: { key: a.key },
      // Backfill the trigger on existing rows without touching the studio's
      // saved copy or on/off state.
      update: { trigger: a.key },
      create: {
        key: a.key,
        trigger: a.key,
        channel: a.defaultChannel,
        enabled: false,
        subject: a.defaultSubject,
        template: a.defaultTemplate,
      },
    });
  }
}

// Fire an automation for a user. Sends every enabled automation that matches the
// trigger, preferring class-type-specific versions over the generic default
// when a class context is provided. Records a MessageLog per send. Safe to call
// from server actions; never throws.
export async function fireAutomation(
  trigger: AutomationKey,
  user: Pick<User, "id" | "firstName" | "email" | "phone">,
  vars: Record<string, string>,
  opts?: { classTypeId?: string | null }
): Promise<void> {
  try {
    // Match by trigger, but also by key so legacy default rows (whose trigger
    // may not be backfilled yet, right after a deploy) still fire.
    const rows = await prisma.automation.findMany({
      where: { enabled: true, OR: [{ trigger }, { key: trigger }] },
    });
    if (rows.length === 0) return;

    const classTypeId = opts?.classTypeId ?? null;
    let matches;
    if (classTypeId) {
      const specific = rows.filter((r) => r.classTypeId === classTypeId);
      // A class-type-specific automation overrides the generic default.
      matches =
        specific.length > 0
          ? specific
          : rows.filter((r) => r.classTypeId === null);
    } else {
      matches = rows.filter((r) => r.classTypeId === null);
    }

    const allVars = { firstName: user.firstName, ...vars };

    for (const auto of matches) {
      const body = renderTemplate(auto.template, allVars);
      const subject = renderTemplate(auto.subject ?? "Dwell Studio", allVars);

      const wantEmail = auto.channel === "EMAIL" || auto.channel === "BOTH";
      const wantSms = auto.channel === "SMS" || auto.channel === "BOTH";

      if (wantEmail && user.email) {
        const r = await sendEmail(user.email, subject, body);
        await prisma.messageLog.create({
          data: {
            userId: user.id,
            channel: "EMAIL",
            to: user.email,
            kind: trigger,
            status: r.simulated ? "SIMULATED" : r.ok ? "SENT" : "FAILED",
            error: r.error,
          },
        });
      }
      if (wantSms && user.phone) {
        const r = await sendSms(user.phone, body);
        await prisma.messageLog.create({
          data: {
            userId: user.id,
            channel: "SMS",
            to: user.phone,
            kind: trigger,
            status: r.simulated ? "SIMULATED" : r.ok ? "SENT" : "FAILED",
            error: r.error,
          },
        });
      }
    }
  } catch {
    // Automations must never break the user-facing action that triggered them.
  }
}
