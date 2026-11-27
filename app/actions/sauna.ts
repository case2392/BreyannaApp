"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { bookSauna, cancelSauna, getSaunaSettings, saveSaunaSettings } from "@/lib/sauna";
import { DAY_NAMES, normalizeSaunaSettings } from "@/lib/saunaShared";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) throw new Error("Not authorized");
  return user;
}

function refresh() {
  revalidatePath("/sauna");
  revalidatePath("/bookings");
  revalidatePath("/account");
  revalidatePath("/admin/sauna");
}

// ---- Members ---------------------------------------------------------------

export async function bookMySauna(input: {
  startsAt: string;
  people?: number;
  guestNames?: string;
  acceptGuidelines?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const res = await bookSauna({ ...input, userId: user.id });
  if (res.ok) refresh();
  return res;
}

export async function cancelMySauna(bookingId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  const res = await cancelSauna(bookingId, { userId: user.id });
  if (res.ok) refresh();
  return res;
}

// ---- Staff -----------------------------------------------------------------

export async function saveSaunaSettingsForm(_prev: unknown, formData: FormData) {
  await requireStaff();
  const current = await getSaunaSettings();
  const next = normalizeSaunaSettings({
    enabled: formData.get("enabled") === "on",
    name: formData.get("name"),
    description: formData.get("description"),
    sessionMinutes: formData.get("sessionMinutes"),
    bufferMinutes: formData.get("bufferMinutes"),
    maxPeople: formData.get("maxPeople"),
    bookAheadDays: formData.get("bookAheadDays"),
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    cancelHours: formData.get("cancelHours"),
    dailyLimit: formData.get("dailyLimit"),
    guidelines: formData.get("guidelines"),
    hours: DAY_NAMES.map((_, i) => ({
      closed: formData.get(`closed-${i}`) === "on",
      open: String(formData.get(`open-${i}`) || current.hours[i].open),
      close: String(formData.get(`close-${i}`) || current.hours[i].close),
    })),
  });
  for (const [i, h] of next.hours.entries()) {
    if (!h.closed && h.open >= h.close)
      return { error: `${DAY_NAMES[i]}: closing time must be after opening time.` };
  }
  await saveSaunaSettings(next);
  refresh();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function staffBookSauna(_prev: unknown, formData: FormData) {
  await requireStaff();
  const userId = String(formData.get("userId") || "");
  const startsAt = String(formData.get("startsAt") || "");
  if (!userId) return { error: "Choose a member." };
  if (!startsAt) return { error: "Choose a time." };
  const res = await bookSauna({
    userId,
    startsAt,
    people: Number(formData.get("people")) || 1,
    guestNames: String(formData.get("guestNames") || ""),
    staff: true,
    comp: formData.get("comp") === "on",
  });
  if (!res.ok) return { error: res.error };
  refresh();
  return { ok: true };
}

export async function staffCancelSauna(bookingId: string, refund: boolean) {
  await requireStaff();
  const res = await cancelSauna(bookingId, { staff: true, refund });
  refresh();
  return res;
}

export async function setSaunaBookingStatus(
  bookingId: string,
  status: "BOOKED" | "ATTENDED" | "NO_SHOW"
) {
  await requireStaff();
  await prisma.saunaBooking.updateMany({
    where: { id: bookingId, status: { in: ["BOOKED", "ATTENDED", "NO_SHOW"] } },
    data: { status },
  });
  refresh();
  return { ok: true };
}

export async function addSaunaBlock(_prev: unknown, formData: FormData) {
  await requireStaff();
  const date = String(formData.get("date") || "");
  const allDay = formData.get("allDay") === "on";
  const from = allDay ? "00:00" : String(formData.get("from") || "");
  const to = allDay ? "" : String(formData.get("to") || "");
  if (!date) return { error: "Pick a date." };
  const startsAt = new Date(`${date}T${from || "00:00"}:00Z`);
  let endsAt = to ? new Date(`${date}T${to}:00Z`) : new Date(startsAt.getTime() + 24 * 3600e3);
  if (allDay) endsAt = new Date(new Date(`${date}T00:00:00Z`).getTime() + 24 * 3600e3);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt)
    return { error: "The end time must be after the start time." };
  await prisma.saunaBlock.create({
    data: {
      startsAt,
      endsAt,
      reason: String(formData.get("reason") || "").trim().slice(0, 120) || null,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteSaunaBlock(id: string) {
  await requireStaff();
  await prisma.saunaBlock.deleteMany({ where: { id } });
  refresh();
  return { ok: true };
}
