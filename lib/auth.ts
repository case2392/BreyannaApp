import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { prisma } from "./db";
import type { User } from "@prisma/client";

export { hashPassword, verifyPassword } from "./password";

const COOKIE_NAME = "breyanna_session";
// In a real deployment set AUTH_SECRET in the environment. This fallback keeps
// local development working out of the box.
const SECRET = process.env.AUTH_SECRET || "breyanna-dev-secret-change-me";
const SESSION_DAYS = 30;

// ---- Signed session token (HMAC) -------------------------------------------

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function createToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (sign(`${userId}.${exp}`) !== sig) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}

// ---- Public helpers --------------------------------------------------------

export function setSessionCookie(userId: string) {
  cookies().set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = readToken(token);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export function isStaff(role: string): boolean {
  return role === "STAFF" || role === "OWNER";
}
