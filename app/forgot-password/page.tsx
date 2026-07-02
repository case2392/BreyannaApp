import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/AuthForms";
import { Logo } from "@/components/Brand";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "MEMBER" ? "/schedule" : "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-ink-50 to-sage-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <h1 className="mb-1 text-2xl font-semibold">Forgot your password?</h1>
          <p className="mb-6 text-sm text-ink-500">
            Enter your email and we&apos;ll send you a link to reset it.
          </p>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
