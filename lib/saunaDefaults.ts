// One-time setup of the sauna included with existing class memberships, as
// the studio asked: Founding 1/month, Pioneer 4/month, Dwell Collective and
// Giveaway Winner unlimited. Runs once (flag in AppSetting), only fills plans
// that don't have a sauna setting yet, and can be changed any time in CRM →
// Plans → Edit → "Sauna included".

import { prisma } from "./db";
import { classAccess } from "./booking";

const FLAG = "saunaIncludedDefaultsApplied";
const RULES: { match: string; perMonth: number }[] = [
  { match: "founding", perMonth: 1 },
  { match: "pioneer", perMonth: 4 },
  { match: "dwell collective", perMonth: -1 },
  { match: "giveaway", perMonth: -1 },
];

export async function applySaunaIncludedDefaults() {
  await applyMommyBonusDefaults();
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

// One-time setup: Mommy & Me Unlimited includes 1 adult class a month, usable
// on the classes a regular (non-Mommy & Me) membership can book. Editable in
// CRM → Plans → Edit → "Bonus classes".
const BONUS_FLAG = "mommyBonusDefaultsApplied";

export async function applyMommyBonusDefaults() {
  try {
    const done = await prisma.appSetting.findUnique({ where: { key: BONUS_FLAG } });
    if (done) return;
    const plans = await prisma.membershipPlan.findMany({
      where: { category: "CLASS" },
      select: {
        id: true,
        name: true,
        kind: true,
        active: true,
        restrictedClass: true,
        bonusClassesPerMonth: true,
      },
    });
    const isMommy = (n: string) => /mommy/i.test(n);
    const targets = plans.filter(
      (p) => p.kind === "UNLIMITED" && isMommy(p.name) && p.bonusClassesPerMonth === 0
    );
    if (targets.length > 0) {
      // "Adult" classes = what a regular membership can book.
      const regular = new Set(
        plans.filter((p) => p.active && !p.restrictedClass && !isMommy(p.name)).map((p) => p.id)
      );
      const types = await prisma.classType.findMany({
        where: { active: true, free: false },
        select: { id: true, name: true, requiresMatchingPlan: true, allowedPlanIds: true },
      });
      const adult: string[] = [];
      for (const t of types) {
        if (isMommy(t.name)) continue;
        const access = await classAccess(t);
        const ok = access.allowedPlanIds
          ? access.allowedPlanIds.some((id) => regular.has(id))
          : !access.gated;
        if (ok) adult.push(t.id);
      }
      for (const p of targets) {
        await prisma.membershipPlan.update({
          where: { id: p.id },
          data: { bonusClassesPerMonth: 1, bonusClassTypeIds: adult.join(",") || null },
        });
      }
    }
    await prisma.appSetting.upsert({
      where: { key: BONUS_FLAG },
      create: { key: BONUS_FLAG, value: new Date().toISOString() },
      update: {},
    });
  } catch {
    // Never block a page over this.
  }
}
