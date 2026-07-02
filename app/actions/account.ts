"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function updateProfile(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!firstName || !lastName || !email)
    return { error: "First name, last name and email are required." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id)
    return { error: "That email is already in use by another account." };

  await prisma.user.update({
    where: { id: user.id },
    data: { firstName, lastName, phone: phone || null, email },
  });

  revalidatePath("/account");
  return { ok: true, message: "Profile updated." };
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");

  if (next.length < 6)
    return { error: "New password must be at least 6 characters." };
  if (!verifyPassword(current, user.passwordHash))
    return { error: "Your current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next) },
  });

  return { ok: true, message: "Password changed." };
}
