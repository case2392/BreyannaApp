// Live health check for email + texting, shown on the CRM Messages page.
// Reads only non-secret settings (addresses, phone number) and asks the
// providers about the account, so problems are spelled out in plain language
// instead of messages silently not arriving.

import { promises as dns } from "dns";
import { prisma } from "./db";
import { deliveryHint } from "./deliveryHints";
import {
  RESEND_DEFAULT_FROM,
  emailConfigured,
  smsConfigured,
} from "./messaging";
import { formatPhone } from "./phone";

export type CheckLevel = "ok" | "warn" | "bad";
export type CheckItem = { level: CheckLevel; text: string };

export type DeliveryCheck = {
  email: { configured: boolean; from: string; items: CheckItem[] };
  sms: { configured: boolean; from: string | null; items: CheckItem[] };
  recentFailures: {
    channel: string;
    error: string;
    hint: string | null;
    count: number;
    lastAt: Date;
  }[];
  // Messages "sent" in the last 30 days while that channel wasn't connected.
  skipped: { email: number; sms: number };
};

const addressOf = (from: string) =>
  (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
const domainOf = (addr: string) => addr.split("@")[1] ?? "";

// Does this domain accept email (has an inbox)? null = couldn't tell.
async function hasInbox(domain: string): Promise<boolean | null> {
  if (!domain) return null;
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 3000),
      ),
    ]);
    return mx.length > 0;
  } catch (e: any) {
    // ENODATA = the domain exists but has no mail server. Anything else (e.g.
    // a DNS hiccup) = unknown, so we don't raise a false alarm.
    if (e?.code === "ENODATA") return false;
    return null;
  }
}

async function fetchJson(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return { status: res.status, json: res.ok ? await res.json() : null };
  } catch {
    return { status: 0, json: null };
  }
}

export async function runDeliveryCheck(): Promise<DeliveryCheck> {
  // ---------------- Email ----------------
  const from = process.env.RESEND_FROM || RESEND_DEFAULT_FROM;
  const replyTo = process.env.RESEND_REPLY_TO || "";
  const emailItems: CheckItem[] = [];
  const emailOn = emailConfigured();
  if (!emailOn) {
    emailItems.push({
      level: "bad",
      text: "Email isn't connected (no RESEND_API_KEY in Vercel), so nothing is sent.",
    });
  } else {
    const fromAddr = addressOf(from);
    const fromDomain = domainOf(fromAddr);
    if (fromDomain === "resend.dev") {
      emailItems.push({
        level: "bad",
        text: "Emails go out from Resend's test address (onboarding@resend.dev), which can ONLY email the Resend account owner — members never get them. In Vercel, set RESEND_FROM to Dwell Studio <hello@dwellstudiolnk.com> (any name @dwellstudiolnk.com works) and redeploy.",
      });
    } else {
      emailItems.push({ level: "ok", text: `Sending from ${from}` });
      // Is the sending domain verified in Resend? (Only readable with a
      // full-access key; a sending-only key can't list domains.)
      const r = await fetchJson("https://api.resend.com/domains", {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      });
      const domains: { name: string; status: string }[] = r.json?.data ?? [];
      if (r.json) {
        const d = domains.find((x) => x.name.toLowerCase() === fromDomain);
        if (!d)
          emailItems.push({
            level: "bad",
            text: `${fromDomain} isn't added in Resend. Add it under Resend → Domains so emails can be sent from it.`,
          });
        else if (d.status !== "verified")
          emailItems.push({
            level: "bad",
            text: `${fromDomain} is "${d.status}" in Resend, not verified yet. Open Resend → Domains and click Verify (the DNS records are in Vercel).`,
          });
        else
          emailItems.push({
            level: "ok",
            text: `${fromDomain} is verified in Resend`,
          });
      }
    }

    // Where do replies go? (Skipped while still on the test address — that's
    // already flagged above.)
    if (fromDomain === "resend.dev" && !replyTo) {
      // nothing more to add
    } else {
      const replyAddr = replyTo ? addressOf(replyTo.split(",")[0]) : fromAddr;
      const inbox = await hasInbox(domainOf(replyAddr));
      if (!replyTo && inbox === false) {
        emailItems.push({
          level: "warn",
          text: `When members hit Reply, it goes to ${replyAddr} — but ${domainOf(replyAddr)} has no inbox, so replies bounce. In Vercel, set RESEND_REPLY_TO to the studio inbox you read (e.g. your Gmail).`,
        });
      } else if (inbox === false) {
        emailItems.push({
          level: "warn",
          text: `Replies go to ${replyAddr}, but ${domainOf(replyAddr)} can't receive email. Set RESEND_REPLY_TO to an inbox you read.`,
        });
      } else if (replyTo) {
        emailItems.push({
          level: "ok",
          text: `Member replies go to ${replyTo}`,
        });
      }
    }
  }

  // ---------------- Texting ----------------
  const smsOn = smsConfigured();
  const smsFrom = process.env.TWILIO_FROM_NUMBER ?? null;
  const smsItems: CheckItem[] = [];
  if (!smsOn) {
    smsItems.push({
      level: "bad",
      text: "Texting isn't connected yet — there's no Twilio account linked, so no texts can be sent. (Until it is, use Members → Copy phone numbers to text from your phone.)",
    });
  } else {
    smsItems.push({
      level: "ok",
      text: `Texting from ${formatPhone(smsFrom)}`,
    });
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const auth = Buffer.from(
      `${sid}:${process.env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const r = await fetchJson(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        Authorization: `Basic ${auth}`,
      },
    );
    if (r.status === 401)
      smsItems.push({
        level: "bad",
        text: "Twilio rejected the Account SID / Auth Token. Re-copy both from the Twilio console into Vercel.",
      });
    else if (r.json?.status && r.json.status !== "active")
      smsItems.push({
        level: "bad",
        text: `The Twilio account is "${r.json.status}". Log in to Twilio to reactivate it.`,
      });
    else if (r.json?.type === "Trial")
      smsItems.push({
        level: "bad",
        text: "The Twilio account is a free trial — it can only text numbers you've verified, and adds a trial notice. Upgrade it in Twilio (add a payment method).",
      });
    smsItems.push({
      level: "warn",
      text: "US carriers block business texts from numbers that aren't registered (A2P 10DLC or toll-free verification). If texts show as sent but never arrive, finish that registration in Twilio.",
    });
  }

  // ---------------- Recent problems ----------------
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [failed, skippedEmail, skippedSms] = await Promise.all([
    prisma.messageLog.findMany({
      where: { status: "FAILED", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { channel: true, error: true, createdAt: true },
    }),
    prisma.messageLog.count({
      where: {
        status: "SIMULATED",
        channel: "EMAIL",
        createdAt: { gte: since },
      },
    }),
    prisma.messageLog.count({
      where: { status: "SIMULATED", channel: "SMS", createdAt: { gte: since } },
    }),
  ]);
  const groups = new Map<string, DeliveryCheck["recentFailures"][number]>();
  for (const f of failed) {
    const error = f.error ?? "Unknown error";
    const key = `${f.channel}|${error}`;
    const g = groups.get(key);
    if (g) g.count++;
    else
      groups.set(key, {
        channel: f.channel,
        error,
        hint: deliveryHint(error),
        count: 1,
        lastAt: f.createdAt,
      });
  }

  return {
    email: { configured: emailOn, from, items: emailItems },
    sms: { configured: smsOn, from: smsFrom, items: smsItems },
    recentFailures: Array.from(groups.values()).slice(0, 8),
    skipped: { email: skippedEmail, sms: skippedSms },
  };
}
