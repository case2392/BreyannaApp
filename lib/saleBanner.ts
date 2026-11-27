// The site-wide sale banner. It shows on its own whenever a plan or event sale
// is live (unless the studio turns it off), linking to the plans page.

import { prisma } from "./db";
import { activeSale, saleEndsLabel } from "./sale";
import { studioNow } from "./time";

export type SaleBannerSettings = { enabled: boolean; message: string };

const KEY = "saleBanner";

export async function getSaleBannerSettings(): Promise<SaleBannerSettings> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    if (row) {
      const v = JSON.parse(row.value);
      return { enabled: v.enabled !== false, message: String(v.message ?? "") };
    }
  } catch {
    // Missing or unreadable → defaults.
  }
  return { enabled: true, message: "" };
}

export async function saveSaleBannerSettings(s: SaleBannerSettings) {
  const value = JSON.stringify({
    enabled: s.enabled,
    message: s.message.trim().slice(0, 140),
  });
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}

export type SaleBanner = {
  id: string;
  message: string;
  endsLabel: string | null;
  href: string;
  cta: string;
};

// The banner to show right now, or null when no sale is live.
export async function currentSaleBanner(signedIn: boolean): Promise<SaleBanner | null> {
  const settings = await getSaleBannerSettings();
  if (!settings.enabled) return null;
  const now = studioNow();
  const [plans, events] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { active: true, salePriceCents: { not: null } },
      select: { priceCents: true, salePriceCents: true, saleStartsAt: true, saleEndsAt: true },
    }),
    prisma.event.findMany({
      where: { active: true, salePriceCents: { not: null } },
      select: { priceCents: true, salePriceCents: true, saleStartsAt: true, saleEndsAt: true },
    }),
  ]);
  const planSales = plans.map((p) => activeSale(p, now)).filter((s) => s !== null);
  const eventSales = events.map((e) => activeSale(e, now)).filter((s) => s !== null);
  const all = [...planSales, ...eventSales];
  if (all.length === 0) return null;

  const best = Math.max(...all.map((s) => s!.percentOff));
  const ends = all
    .map((s) => s!.endsAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const onPlans = planSales.length > 0;
  const message =
    settings.message ||
    (onPlans
      ? best >= 1
        ? `Sale on now — save up to ${best}% on plans`
        : "Sale on now — special prices on plans"
      : "Sale on now — event tickets are discounted");
  return {
    // Changes when the sale or wording changes, so a dismissed banner returns
    // for the next sale.
    id: `${message}|${ends?.toISOString() ?? ""}`,
    message,
    endsLabel: saleEndsLabel(ends, now),
    href: onPlans ? (signedIn ? "/memberships" : "/#membership") : "/events",
    cta: onPlans ? "See plans" : "See events",
  };
}
