import { prisma } from "./db";
import { sendEmail } from "./messaging";

// Where studio notifications go. Prefers an explicit env override, then the
// configured reply-to (studio's inbox), then any owner/staff account emails.
async function studioRecipients(): Promise<string[]> {
  const override =
    process.env.STUDIO_NOTIFY_EMAIL || process.env.RESEND_REPLY_TO;
  if (override) {
    return override
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const staff = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "STAFF"] } },
    select: { email: true },
  });
  return staff.map((s) => s.email).filter(Boolean);
}

// Email the studio about something (new booking, new purchase, …).
// Best-effort — never throws, so it can't break the member-facing action.
export async function notifyStudio(subject: string, text: string): Promise<void> {
  try {
    const recipients = await studioRecipients();
    for (const to of recipients) {
      await sendEmail(to, subject, text);
    }
  } catch {
    // ignore — notifications must not affect the booking/purchase flow
  }
}
