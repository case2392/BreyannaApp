import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/AuthForms";
import { Logo } from "@/components/Brand";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "MEMBER" ? "/schedule" : "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-ink-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 text-sm text-ink-500">
            Sign in to book classes and manage your membership.
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Demo logins — Member: <b>member@demo.com</b> · Owner:{" "}
          <b>owner@demo.com</b> · Password: <b>password</b>
        </p>
      </div>
    </main>
  );
}
