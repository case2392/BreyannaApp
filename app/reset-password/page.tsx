import Link from "next/link";
import { ResetPasswordForm } from "@/components/AuthForms";
import { Logo } from "@/components/Brand";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-ink-50 to-sage-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <h1 className="mb-1 text-2xl font-semibold">Set a new password</h1>
          {token ? (
            <>
              <p className="mb-6 text-sm text-ink-500">
                Choose a new password for your account.
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-ink-500">
              This link is missing its reset code.{" "}
              <Link href="/forgot-password" className="font-semibold text-brand-600">
                Request a new reset link
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
