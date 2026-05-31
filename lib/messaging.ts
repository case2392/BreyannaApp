// Email + SMS delivery. Works in "simulation" mode when no provider keys are
// configured (so the CRM is fully usable immediately), and sends for real once
// RESEND_API_KEY / TWILIO_* are set in the environment.

export type SendResult = {
  ok: boolean;
  simulated: boolean;
  error?: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Dwell Studio <onboarding@resend.dev>";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

export function emailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}
export function smsConfigured(): boolean {
  return Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
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
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, simulated: false, error: `Resend ${res.status}: ${detail.slice(0, 140)}` };
    }
    return { ok: true, simulated: false };
  } catch (e: any) {
    return { ok: false, simulated: false, error: e?.message ?? "Email send failed." };
  }
}

export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (!to) return { ok: false, simulated: false, error: "No phone number." };
  if (!smsConfigured()) return { ok: true, simulated: true };

  try {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
    const form = new URLSearchParams({ To: to, From: TWILIO_FROM!, Body: body });
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
      return { ok: false, simulated: false, error: `Twilio ${res.status}: ${detail.slice(0, 140)}` };
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
