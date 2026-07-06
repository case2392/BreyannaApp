import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { money, dayLabel, timeLabel, groupBy } from "@/lib/format";
import { MarketingHeader } from "@/components/MarketingHeader";
import { Logo, DwellSeal } from "@/components/Brand";
import { BrandImage } from "@/components/BrandImage";

export const dynamic = "force-dynamic";

const coreValues = [
  {
    title: "Feed Your Spirit",
    body: "Intentional atmospheres that are designed to bring life to your spirit and challenge you to invite the Holy Spirit to lead you in everything that you do.",
    icon: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z",
  },
  {
    title: "Find Community",
    body: "Connect with women who want to trade worldly practices for sacred rhythms and do life with women on fire for Christ.",
    icon: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c-3.3 0-6 2.2-6 5m12-5a3 3 0 1 0-2-5.2M21 13c0-2.8-2.7-5-6-5",
  },
  {
    title: "Flourish in Freedom",
    body: "Be encouraged to throw off your old sinful nature, lies, thought patterns, and attitudes, and put on your new nature. One that honors and reflects Jesus.",
    icon: "M12 3v18M5 10l7-7 7 7",
  },
];

const reflections = [
  "Do you wish any of your features were different?",
  "Have you felt convicted about the words, music, or environment you've been working out in?",
  "Do you compare your body type or your looks to others?",
  "Are you more concerned with the size of your waist than the condition of your heart?",
  "Do you ever find yourself obsessing over working out or pushing yourself too hard because you “deserve it”?",
  "When you eat, are you constantly thinking about how it'll affect your weight?",
  "Do you ever have trouble thanking God for how He made you?",
];

const kindLabel: Record<string, string> = {
  UNLIMITED: "Unlimited",
  PACK: "Class pack",
  DROP_IN: "Drop-in",
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  const authed = Boolean(user);
  const dashboardHref = user && isStaff(user.role) ? "/admin" : "/schedule";
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [classTypes, plans, upcoming] = await Promise.all([
    prisma.classType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.membershipPlan.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.classSession.findMany({
      where: { cancelled: false, startsAt: { gt: now, lt: weekEnd } },
      orderBy: { startsAt: "asc" },
      include: { classType: true, instructor: true },
    }),
  ]);
  const upcomingByDay = groupBy(upcoming, (s) => s.startsAt.toDateString());

  return (
    <div className="bg-ink-50">
      <MarketingHeader authed={authed} dashboardHref={dashboardHref} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Optional hero photo (shows if /photos/hero.jpg exists). */}
        <BrandImage
          src="/photos/hero.jpg"
          alt=""
          hideOnError
          className="absolute inset-0 h-full w-full object-[center_60%]"
        />
        {/* Soft cream veil — lets the photo show through while keeping text readable. */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-50/40 via-ink-50/60 to-ink-50" />
        {/* Extra glow concentrated behind the text block for legibility. */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-50/70 via-ink-50/40 to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-28 text-center md:pb-28 md:pt-64">
          <span className="animate-rise mb-6 block h-10 w-px bg-gradient-to-b from-transparent to-clay-400" />
          <h1 className="animate-rise max-w-3xl font-brand text-4xl font-semibold leading-[1.08] text-ink-900 [text-shadow:0_1px_1px_rgba(244,241,236,1),0_2px_16px_rgba(244,241,236,0.9)] sm:text-6xl">
            A Christ-centered movement studio for women
          </h1>
          <p
            className="animate-rise mt-6 max-w-xl text-lg font-medium text-ink-800 [text-shadow:0_1px_1px_rgba(244,241,236,1),0_1px_10px_rgba(244,241,236,0.9)]"
            style={{ animationDelay: "0.1s" }}
          >
            Honoring the body as God&apos;s dwelling place through cycle,
            movement, and dance.
          </p>
          <p
            className="animate-rise mt-4 font-serif text-xl italic text-brand-700 [text-shadow:0_1px_8px_rgba(244,241,236,0.95)]"
            style={{ animationDelay: "0.2s" }}
          >
            Feed your spirit. Find community. Flourish in freedom.
          </p>
          <div
            className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.32s" }}
          >
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Book your first class
            </Link>
            <a href="#membership" className="btn-secondary px-6 py-3 text-base">
              View memberships
            </a>
          </div>
          <p
            className="animate-rise mt-5 text-sm text-ink-500"
            style={{ animationDelay: "0.42s" }}
          >
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* Core values */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {coreValues.map((p) => (
            <div key={p.title} className="card card-interactive p-7 text-center">
              <span className="bg-sunset mx-auto flex h-14 w-14 items-center justify-center rounded-full">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-ink-50">
                  <svg className="h-6 w-6 text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path d={p.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
              <h3 className="mt-4 text-2xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-soft ring-1 ring-ink-900/5">
            <BrandImage src="/photos/about.jpg" alt="Women worshipping and moving together at Dwell Studio" className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/60 to-transparent p-6">
              <p className="font-serif text-xl italic text-white">
                &ldquo;Look at what the Lord has done.&rdquo;
              </p>
            </div>
          </div>
          <div>
            <p className="eyebrow">
              Our heart
            </p>
            <h2 className="mt-3 text-4xl font-semibold">Set apart for believers</h2>
            <p className="mt-5 text-ink-600">
              Welcome to a space set apart for believers, where you no longer
              have to compromise your conviction or your walk with Jesus to move
              your body. Instead, be encouraged in your relationship with the
              Lord, challenged to live higher, and experience the wholeness that
              He died to give you.
            </p>
            <p className="mt-4 text-ink-600">
              Trade the noise of worldly fitness culture for a space filled with
              worship, truth, and movement that leads you closer to Jesus.
            </p>
            <div className="mt-7 flex gap-3">
              <Link href="/register" className="btn-primary">
                Start your journey
              </Link>
              <a href="#schedule" className="btn-secondary">
                See the schedule
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Is this for me? */}
      <section className="relative overflow-hidden bg-sage-100 py-20">
        <span className="ambient bg-sunset -right-28 -top-10 h-72 w-72 opacity-25" />
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-4xl font-semibold">How do I know this is for me?</h2>
            <span className="rule mt-5" />
            <p className="mt-5 text-ink-600">
              If your answer is yes to any of these, you&apos;re in the right
              place.
            </p>
          </div>
          <ul className="mx-auto mt-8 max-w-2xl space-y-3">
            {reflections.map((q) => (
              <li key={q} className="flex items-start gap-3 rounded-2xl bg-white/70 px-5 py-4 shadow-soft transition-colors hover:bg-white">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <span className="text-ink-700">{q}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center">
            <Link href="/register" className="btn-primary px-6 py-3">
              This is for me — let&apos;s begin
            </Link>
          </p>
        </div>
      </section>

      {/* Classes */}
      <section id="classes" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <p className="eyebrow">
            Move with us
          </p>
          <h2 className="mt-3 text-4xl font-semibold">Our classes</h2>
          <span className="rule mt-5" />
          <p className="mx-auto mt-5 max-w-xl text-ink-600">
            A variety of formats welcome to all experience levels, set to music
            that honors God, and produces a pleasing aroma and offering of
            worship to Him.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classTypes.map((c) => (
            <div key={c.id} className="card card-interactive overflow-hidden">
              <div className="h-2 w-full" style={{ backgroundColor: c.color }} />
              <div className="p-6">
                <h3 className="text-xl font-semibold">{c.name}</h3>
                <p className="mt-2 text-sm text-ink-600">{c.description}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-ink-400">
                  {c.duration} minutes
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community gallery */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="eyebrow">
              Our community
            </p>
            <h2 className="mt-3 text-4xl font-semibold">Stronger together</h2>
            <span className="rule mt-5" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { src: "/photos/cycle.jpg", alt: "Dwell cycle class" },
              { src: "/photos/community.jpg", alt: "Dwell community" },
              { src: "/photos/movement.jpg", alt: "Movement and worship at Dwell" },
            ].map((img) => (
              <div key={img.src} className="group aspect-[4/5] overflow-hidden rounded-2xl shadow-soft ring-1 ring-ink-900/5">
                <BrandImage src={img.src} alt={img.alt} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule preview */}
      <section id="schedule" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <p className="eyebrow">
            This week
          </p>
          <h2 className="mt-3 text-4xl font-semibold">Upcoming classes</h2>
          <span className="rule mt-5" />
          <p className="mx-auto mt-5 max-w-xl text-ink-600">
            Reserve your spot in seconds. New here? Create a free account to
            book your first class.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-ink-200 bg-white p-8 text-center text-ink-500 shadow-soft">
            New classes are being scheduled — check back soon!
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-3xl space-y-6">
            {[...upcomingByDay.entries()].map(([day, list]) => (
              <div key={day}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
                  {dayLabel(new Date(day))}
                </h3>
                <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
                  {list.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-ink-50/60">
                      <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: s.classType.color }} />
                      <div className="w-20 shrink-0 text-sm font-semibold">
                        {timeLabel(s.startsAt)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{s.classType.name}</div>
                        <div className="truncate text-sm text-ink-500">{s.instructor.name}</div>
                      </div>
                      <Link href="/login" className="btn-secondary shrink-0 text-xs">
                        Reserve
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/register" className="btn-primary px-6 py-3">
            Create an account to book
          </Link>
        </div>
      </section>

      {/* Membership */}
      <section id="membership" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="eyebrow">
              Join the community
            </p>
            <h2 className="mt-3 text-4xl font-semibold">Memberships &amp; passes</h2>
            <span className="rule mt-5" />
            <p className="mx-auto mt-5 max-w-xl text-ink-600">
              Whether you&apos;re here every day or dropping in, there&apos;s an
              option for you.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => {
              return (
                <div key={p.id} className="card card-interactive flex flex-col p-6">
                  <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {kindLabel[p.kind]}
                  </span>
                  <h3 className="mt-1 text-xl font-semibold">{p.name}</h3>
                  <div className="mt-3">
                    <span className="font-serif text-4xl font-semibold">{money(p.priceCents)}</span>
                    {p.kind === "UNLIMITED" && <span className="text-sm text-ink-500">/month</span>}
                  </div>
                  <ul className="mt-4 space-y-1 text-sm text-ink-600">
                    <li>
                      {p.kind === "UNLIMITED"
                        ? "Unlimited classes"
                        : `${p.credits} class credit${p.credits === 1 ? "" : "s"}`}
                    </li>
                    <li>
                      {p.kind === "UNLIMITED"
                        ? "Auto-renews monthly"
                        : "Credits never expire"}
                    </li>
                  </ul>
                  <Link href="/register" className="btn-primary mt-6">
                    Get started
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Saturday community CTA */}
      <section className="px-4 py-20">
        <div className="bg-sunset relative mx-auto max-w-6xl overflow-hidden rounded-3xl p-1.5">
          <div className="rounded-[1.35rem] bg-ink-900 px-8 py-14 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Every Saturday
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Community Movement &amp; Bible Study
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Bring a friend for outdoor movement and time in the Word. All are
              welcome — come as you are.
            </p>
            <Link href="/register" className="btn-brand mt-7 px-6 py-3">
              Save my spot
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsor a Sister */}
      <section className="relative overflow-hidden bg-sage-100 py-20">
        <span className="ambient bg-sunset -left-24 top-6 h-72 w-72 opacity-30" />
        <span className="ambient bg-sunset -right-24 bottom-0 h-64 w-64 opacity-25" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <p className="eyebrow text-brand-700">
            Sponsor a Sister
          </p>
          <h2 className="mt-3 text-4xl font-semibold">Give the gift of Dwell</h2>
          <span className="rule mt-5" />
          <p className="mx-auto mt-5 max-w-xl text-ink-600">
            Help sponsor a membership for a woman who couldn&apos;t otherwise be
            here. Give any amount, once or monthly — cost should never keep a
            sister from worship, movement, and community.
          </p>
          <Link href="/sponsor" className="btn-primary mt-7 px-6 py-3">
            Sponsor a sister
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="visit"
        className="scroll-mt-20 border-t border-ink-200 bg-gradient-to-b from-ink-50 to-ink-100"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-3">
          <div>
            <DwellSeal size={64} />
            <div className="mt-4">
              <Logo />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-600">
              A Christ-centered movement studio for women. Feed your spirit.
              Find community. Flourish in freedom.
            </p>
          </div>
          <div>
            <h4 className="font-serif text-lg font-semibold">Visit us</h4>
            <p className="mt-3 text-sm text-ink-600">
              800 W Stockwell St<br />
              Lincoln, NE
            </p>
            <a
              href="https://instagram.com/dwellstudio.lnk"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
            >
              @dwellstudio.lnk →
            </a>
          </div>
          <div>
            <h4 className="font-serif text-lg font-semibold">Get started</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/register" className="font-semibold text-brand-600 hover:underline">
                Create an account
              </Link>
              <Link href="/login" className="text-ink-600 hover:underline">
                Member sign in
              </Link>
              <a href="#classes" className="text-ink-600 hover:underline">
                Browse classes
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-ink-100 py-5 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} Dwell Studio · Lincoln, NE
        </div>
      </footer>
    </div>
  );
}
