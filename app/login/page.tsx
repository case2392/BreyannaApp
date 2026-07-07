import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";
import { DwellSeal } from "@/components/Brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "MEMBER" ? "/schedule" : "/admin");
  const next =
    searchParams.next && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;

  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      {/* Brand / story panel */}
      <section className="bg-sunset relative flex flex-col items-center justify-center px-6 py-12 text-center md:w-1/2 md:py-0">
        <div className="absolute inset-0 bg-ink-900/10" />
        <div className="relative flex flex-col items-center">
          <DwellSeal size={120} />
          <h1 className="mt-6 font-brand text-3xl font-semibold text-white drop-shadow-sm sm:text-4xl">
            A movement studio for women
          </h1>
          <p className="mt-3 max-w-sm text-white/90">
            A Christ-centered space to worship, workout, and grow closer to
            Jesus.
          </p>
          <p className="mt-6 font-serif text-lg italic text-white">
            Feed your spirit. Find community. Flourish in freedom.
          </p>
          <p className="mt-8 text-xs uppercase tracking-[0.2em] text-white/80">
            800 W Stockwell St · Lincoln, NE
          </p>
        </div>
      </section>

      {/* Sign-in form */}
      <section className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <h2 className="mb-1 text-2xl font-semibold">Welcome back</h2>
            <p className="mb-6 text-sm text-ink-500">
              Sign in to book classes and manage your membership.
            </p>
            <LoginForm next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
