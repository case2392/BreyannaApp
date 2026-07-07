"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/auth";
import { fireAutomation } from "@/lib/automations";
import { sendEmail } from "@/lib/messaging";

export async function login(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Incorrect email or password." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  setSessionCookie(user.id);
  // Return to where they came from (e.g. an event page) when it's a safe
  // in-app path; otherwise go to the default home for their role.
  const next = String(formData.get("next") || "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(user.role === "MEMBER" ? "/schedule" : "/admin");
}

export async function register(_prev: unknown, formData: FormData) {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const password = String(formData.get("password") || "");

  if (!firstName || !lastName || !email || !phone || !password) {
    return { error: "Please fill in all required fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      passwordHash: hashPassword(password),
      role: "MEMBER",
      lastLoginAt: new Date(),
    },
  });

  await fireAutomation("welcome", user, {});

  setSessionCookie(user.id);
  redirect("/schedule");
}

export async function logout() {
  clearSessionCookie();
  redirect("/login");
}

// ---- Password reset --------------------------------------------------------

function resetLink(token: string): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
  return `${origin}/reset-password?token=${token}`;
}

export async function requestPasswordReset(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Please enter your email." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    await sendEmail(
      email,
      "Reset your Dwell Studio password",
      `Hi ${user.firstName},\n\nReset your password using the link below (it expires in 1 hour):\n\n${resetLink(token)}\n\nIf you didn't request this, you can ignore this email.`
    );
  }

  // Always return the same response so we never reveal whether an email exists.
  return { ok: true };
}

export async function resetPassword(_prev: unknown, formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 6)
    return { error: "Password must be at least 6 characters." };

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired — please request a new one." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { usedAt: new Date() },
    }),
  ]);
  return { ok: true };
}
