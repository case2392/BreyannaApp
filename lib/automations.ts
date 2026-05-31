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
};

// The available automations and their default copy.
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
  },
];

export function automationDef(key: string): Def | undefined {
  return AUTOMATIONS.find((a) => a.key === key);
}

// Make sure a row exists for every automation (seeded as disabled by default).
export async function ensureAutomations() {
  for (const a of AUTOMATIONS) {
    await prisma.automation.upsert({
      where: { key: a.key },
      update: {},
      create: {
        key: a.key,
        channel: a.defaultChannel,
        enabled: false,
        subject: a.defaultSubject,
        template: a.defaultTemplate,
      },
    });
  }
}

// Fire an automation for a user if it is enabled. Records a MessageLog per send.
// Safe to call from server actions; never throws.
export async function fireAutomation(
  key: AutomationKey,
  user: Pick<User, "id" | "firstName" | "email" | "phone">,
  vars: Record<string, string>
): Promise<void> {
  try {
    const auto = await prisma.automation.findUnique({ where: { key } });
    if (!auto || !auto.enabled) return;

    const allVars = { firstName: user.firstName, ...vars };
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
          kind: key,
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
          kind: key,
          status: r.simulated ? "SIMULATED" : r.ok ? "SENT" : "FAILED",
          error: r.error,
        },
      });
    }
  } catch {
    // Automations must never break the user-facing action that triggered them.
  }
}
