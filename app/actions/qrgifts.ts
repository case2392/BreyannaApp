"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff, hashPassword } from "@/lib/auth";
import { notifyStudio } from "@/lib/notify";
import {
  normalizeGiftCode,
  generateGiftCode,
  isValidGiftPageToken,
} from "@/lib/giftCodes";
import { buildGiftLabel, giftPhrase } from "@/lib/giftTypes";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) throw new Error("Not authorized");
  return user;
}

const emailish = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

// The gift picked in the CRM form (type + amount/description).
function pickedGift(formData: FormData) {
  return buildGiftLabel(
    String(formData.get("giftType") || ""),
    String(formData.get("giftAmount") || ""),
    String(formData.get("giftCustom") || "")
  );
}

// Public: someone who scanned the QR code submits their info + card code.
// Each code works once.
export async function redeemGiftCode(
  token: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    code: string;
  }
): Promise<{ ok: true; gift: string | null } | { ok: false; error: string }> {
  if (!(await isValidGiftPageToken(token)))
    return { ok: false, error: "This page isn't available." };

  const firstName = input.firstName.trim().slice(0, 80);
  const lastName = input.lastName.trim().slice(0, 80);
  const phone = input.phone.trim().slice(0, 40);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  const code = normalizeGiftCode(input.code);

  if (!firstName || !lastName)
    return { ok: false, error: "Please enter your first and last name." };
  if (phone.replace(/\D/g, "").length < 7)
    return { ok: false, error: "Please enter a valid phone number." };
  if (!emailish(email))
    return { ok: false, error: "Please enter a valid email address." };
  if (!code) return { ok: false, error: "Please enter the code from your card." };

  const found = await prisma.giftCode.findUnique({ where: { code } });
  if (!found)
    return {
      ok: false,
      error:
        "We couldn't find that code. Please double-check the code on your card and try again.",
    };

  // Claim it atomically so the same code can't be redeemed twice.
  const claimed = await prisma.giftCode.updateMany({
    where: { id: found.id, redeemedAt: null },
    data: { redeemedAt: new Date(), firstName, lastName, phone, email },
  });
  if (claimed.count === 0)
    return {
      ok: false,
      error:
        "This code has already been redeemed. If you think that's a mistake, please reach out to us.",
    };

  await notifyStudio(
    `QR gift redeemed: ${firstName} ${lastName}`,
    `${firstName} ${lastName} redeemed card code ${code}` +
      (found.gift ? ` (${found.gift})` : "") +
      `.\nPhone: ${phone}\nEmail: ${email}\n\nSee CRM → QR Code Gift Recipients to set up their account and gift.`
  );
  revalidatePath("/admin/qr-gifts");
  return { ok: true, gift: giftPhrase(found.giftType, found.gift) };
}

// Parse "CODE" or "CODE - gift" / "CODE, gift" lines. Only a comma or a dash
// with spaces around it separates the gift, so codes like DWELL-7K3M stay whole.
function parseCodeLines(text: string) {
  const out: { code: string; gift: string | null }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(.+?)(?:\s*,\s*|\s+[-–—]\s+)(.+)$/);
    const code = normalizeGiftCode(m ? m[1] : line);
    if (!code) continue;
    const gift = (m ? m[2] : "").trim().slice(0, 120) || null;
    out.push({ code, gift });
  }
  return out;
}

// CRM: add codes you wrote on cards (one per line, optional " - gift").
export async function addGiftCodes(_prev: unknown, formData: FormData) {
  await requireStaff();
  const picked = pickedGift(formData);
  if ("error" in picked) return { error: picked.error };
  const parsed = parseCodeLines(String(formData.get("codes") || ""));
  if (parsed.length === 0) return { error: "Enter at least one code." };
  // Every code in this batch gets the picked gift (a "CODE - text" line keeps
  // its own text, as "Other").
  const rows = parsed.map((r) =>
    r.gift
      ? { code: r.code, gift: r.gift, giftType: "OTHER" }
      : { code: r.code, gift: picked.label, giftType: picked.type }
  );

  const unique = Array.from(new Map(rows.map((r) => [r.code, r])).values());
  const existing = await prisma.giftCode.findMany({
    where: { code: { in: unique.map((r) => r.code) } },
    select: { code: true },
  });
  const taken = new Set(existing.map((e) => e.code));
  const fresh = unique.filter((r) => !taken.has(r.code));
  if (fresh.length > 0) {
    await prisma.giftCode.createMany({ data: fresh });
  }
  revalidatePath("/admin/qr-gifts");
  return {
    ok: true,
    message:
      `Added ${fresh.length} code${fresh.length === 1 ? "" : "s"}.` +
      (taken.size > 0 ? ` ${taken.size} already existed and were skipped.` : ""),
  };
}

// CRM: generate random, hard-to-guess codes to write on cards.
export async function generateGiftCodes(_prev: unknown, formData: FormData) {
  await requireStaff();
  const count = Math.min(200, Math.max(1, Number(formData.get("count")) || 0));
  const picked = pickedGift(formData);
  if ("error" in picked) return { error: picked.error };
  const gift = picked.label;

  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateGiftCode());
  const list = Array.from(codes);
  // Extremely unlikely, but never collide with an existing code.
  const existing = await prisma.giftCode.findMany({
    where: { code: { in: list } },
    select: { code: true },
  });
  const taken = new Set(existing.map((e) => e.code));
  const fresh = list.filter((c) => !taken.has(c));
  await prisma.giftCode.createMany({
    data: fresh.map((code) => ({ code, gift, giftType: picked.type })),
  });
  revalidatePath("/admin/qr-gifts");
  return { ok: true, codes: fresh, gift };
}

// CRM: remove an unused code (e.g. a typo).
export async function deleteGiftCode(id: string) {
  await requireStaff();
  await prisma.giftCode.deleteMany({ where: { id, redeemedAt: null } });
  revalidatePath("/admin/qr-gifts");
  return { ok: true };
}

// CRM: mark a recipient as taken care of (account + gift set up).
export async function setGiftHandled(id: string, handled: boolean) {
  await requireStaff();
  await prisma.giftCode.update({ where: { id }, data: { handled } });
  revalidatePath("/admin/qr-gifts");
  return { ok: true };
}

// CRM: create a member account from a redeemed card (or link the existing
// account with the same email). The member can set their own password with
// "Forgot password" on the sign-in page.
export async function createAccountFromGift(id: string) {
  await requireStaff();
  const g = await prisma.giftCode.findUnique({ where: { id } });
  if (!g || !g.redeemedAt || !g.email || !g.firstName || !g.lastName)
    return { ok: false as const, error: "This code hasn't been redeemed yet." };

  const email = g.email.toLowerCase();
  let member = await prisma.user.findUnique({ where: { email } });
  let created = false;
  if (!member) {
    member = await prisma.user.create({
      data: {
        firstName: g.firstName,
        lastName: g.lastName,
        email,
        phone: g.phone,
        // Random password nobody knows — they'll use "Forgot password".
        passwordHash: hashPassword(randomBytes(24).toString("base64url")),
        role: "MEMBER",
        notes: `QR gift card ${g.code}${g.gift ? ` — ${g.gift}` : ""}`,
      },
    });
    created = true;
  }
  await prisma.giftCode.update({ where: { id }, data: { memberId: member.id } });
  revalidatePath("/admin/qr-gifts");
  revalidatePath("/admin/members");
  return { ok: true as const, memberId: member.id, created };
}
