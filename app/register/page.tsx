import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";
import { DwellSeal } from "@/components/Brand";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "MEMBER" ? "/schedule" : "/admin");

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-ink-50 to-sage-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <DwellSeal size={96} />
          <p className="mt-4 max-w-xs text-sm text-ink-500">
            Join our community of women moving, worshipping, and growing
            together.
          </p>
        </div>
        <div className="card p-8">
          <h1 className="mb-1 text-2xl font-semibold">Create your account</h1>
          <p className="mb-6 text-sm text-ink-500">
            It only takes a minute to get started.
          </p>
          <RegisterForm />
          <p className="mt-4 text-center text-xs text-ink-500">
            By creating an account, you agree to our{" "}
            <a href="/terms" className="text-brand-600 hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
