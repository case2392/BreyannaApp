import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";
import { Logo } from "@/components/Brand";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "MEMBER" ? "/schedule" : "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <h1 className="mb-1 text-2xl font-bold">Create your account</h1>
          <p className="mb-6 text-sm text-ink-500">
            Join the studio and start booking classes.
          </p>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
