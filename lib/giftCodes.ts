import { randomBytes } from "crypto";
import { prisma } from "./db";

// Codes are compared uppercase with spaces removed, so "dw 12ab" == "DW12AB".
export function normalizeGiftCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").slice(0, 40);
}

// Readable random code for printing on a card: no 0/O/1/I/L to avoid mix-ups.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function generateGiftCode(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `DWELL-${s}`;
}

const TOKEN_KEY = "qrGiftToken";

// The secret part of the private QR page's address (/welcome/<token>).
// Created once and kept, so printed QR codes keep working.
export async function getGiftPageToken(): Promise<string> {
  const existing = await prisma.appSetting.findUnique({
    where: { key: TOKEN_KEY },
  });
  if (existing) return existing.value;
  const token = randomBytes(9).toString("base64url");
  const created = await prisma.appSetting.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: token },
    update: {},
  });
  return created.value;
}

// Read-only check used by the public page — never creates a token.
export async function isValidGiftPageToken(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.appSetting.findUnique({ where: { key: TOKEN_KEY } });
  return Boolean(row && row.value === token);
}
