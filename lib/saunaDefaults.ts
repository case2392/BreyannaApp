// One-time setup of the sauna included with existing class memberships, as
// the studio asked: Founding 1/month, Pioneer 4/month, Dwell Collective and
// Giveaway Winner unlimited. Runs once (flag in AppSetting), only fills plans
// that don't have a sauna setting yet, and can be changed any time in CRM →
// Plans → Edit → "Sauna included".

import { prisma } from "./db";

const FLAG = "saunaIncludedDefaultsApplied";
const RULES: { match: string; perMonth: number }[] = [
  { match: "founding", perMonth: 1 },
  { match: "pioneer", perMonth: 4 },
  { match: "dwell collective", perMonth: -1 },
  { match: "giveaway", perMonth: -1 },
];

export async function applySaunaIncludedDefaults() {
  try {
    const done = await prisma.appSetting.findUnique({ where: { key: FLAG } });
    if (done) return;
    const plans = await prisma.membershipPlan.findMany({
      where: { category: "CLASS", saunaPerMonth: 0 },
      select: { id: true, name: true },
    });
    for (const p of plans) {
      const rule = RULES.find((r) => p.name.toLowerCase().includes(r.match));
      if (rule)
        await prisma.membershipPlan.update({
          where: { id: p.id },
          data: { saunaPerMonth: rule.perMonth },
        });
    }
    await prisma.appSetting.upsert({
      where: { key: FLAG },
      create: { key: FLAG, value: new Date().toISOString() },
      update: {},
    });
  } catch {
    // Never block a page over this.
  }
}
