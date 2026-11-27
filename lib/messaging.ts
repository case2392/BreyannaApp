import { toE164 } from "./phone";

// Email + SMS delivery. Works in "simulation" mode when no provider keys are
// configured (so the CRM is fully usable immediately), and sends for real once
// RESEND_API_KEY / TWILIO_* are set in the environment.

export type SendResult = {
  ok: boolean;
  simulated: boolean;
  error?: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const RESEND_DEFAULT_FROM = "Dwell Studio <onboarding@resend.dev>";
const RESEND_FROM = process.env.RESEND_FROM || RESEND_DEFAULT_FROM;
// Optional: where member replies should go (e.g. the studio's Gmail).
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

export function emailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}
export function smsConfigured(): boolean {
  return Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
}

// "Resend 403: You can only send testing emails to your own email address".
async function resendError(res: Response): Promise<string> {
  const detail = await res.text();
  let msg = detail;
  try {
    const j = JSON.parse(detail);
    if (j?.message) msg = String(j.message);
  } catch {}
  return `Resend ${res.status}: ${msg.slice(0, 200)}`;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<SendResult> {
  if (!to) return { ok: false, simulated: false, error: "No email address." };
  if (!RESEND_API_KEY) return { ok: true, simulated: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        text,
        ...(RESEND_REPLY_TO ? { reply_to: RESEND_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, simulated: false, error: await resendError(res) };
    }
    return { ok: true, simulated: false };
  } catch (e: any) {
    return { ok: false, simulated: false, error: e?.message ?? "Email send failed." };
  }
}

// Send many emails in ONE Resend request (up to 100). This avoids the per-second
// rate limit that makes a loop of individual sends fail en masse. Returns an
// overall result; on failure the caller can fall back to individual sends to
// get a per-recipient breakdown.
export async function sendEmailBatch(
  messages: { to: string; subject: string; text: string }[]
): Promise<SendResult> {
  if (messages.length === 0) return { ok: true, simulated: false };
  if (!RESEND_API_KEY) return { ok: true, simulated: true };

  try {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        messages.map((m) => ({
          from: RESEND_FROM,
          to: [m.to],
          subject: m.subject,
          text: m.text,
          ...(RESEND_REPLY_TO ? { reply_to: RESEND_REPLY_TO } : {}),
        }))
      ),
    });
    if (!res.ok) {
      return { ok: false, simulated: false, error: await resendError(res) };
    }
    return { ok: true, simulated: false };
  } catch (e: any) {
    return { ok: false, simulated: false, error: e?.message ?? "Batch send failed." };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (!to) return { ok: false, simulated: false, error: "No phone number." };
  if (!smsConfigured()) return { ok: true, simulated: true };
  // Twilio needs +14025551234 — members type numbers all sorts of ways.
  const number = toE164(to);
  if (!number)
    return { ok: false, simulated: false, error: `Not a valid phone number: ${to}` };
  const from = toE164(TWILIO_FROM!) ?? TWILIO_FROM!;

  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
    const form = new URLSearchParams({ To: number, From: from, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      // Twilio errors are JSON: { code: 21608, message: "..." }.
      let msg = detail.slice(0, 160);
      try {
        const j = JSON.parse(detail);
        if (j?.code || j?.message) msg = `${j.code ?? ""} ${j.message ?? ""}`.trim();
      } catch {}
      return { ok: false, simulated: false, error: `Twilio ${res.status}: ${msg.slice(0, 200)}` };
    }
    return { ok: true, simulated: false };
  } catch (e: any) {
    return { ok: false, simulated: false, error: e?.message ?? "SMS send failed." };
  }
}

// Fill {{placeholders}} in a template from a values map.
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}
