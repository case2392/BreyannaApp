"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from "@/app/actions/auth";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState(login, { error: undefined } as {
    error?: string;
  });
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <ErrorBox message={state?.error} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="label mb-0" htmlFor="password">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
        />
      </div>
      <SubmitButton label="Sign in" />
      <p className="text-center text-sm text-ink-500">
        New here?{" "}
        <Link href="/register" className="font-semibold text-brand-600">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormState(requestPasswordReset, {} as {
    error?: string;
    ok?: boolean;
  });

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-800">
        If an account exists for that email, we&apos;ve sent a link to reset your
        password. Please check your inbox (and spam folder).
        <div className="mt-3">
          <Link href="/login" className="font-semibold text-brand-600">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <ErrorBox message={state?.error} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <SubmitButton label="Send reset link" />
      <p className="text-center text-sm text-ink-500">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useFormState(resetPassword, {} as {
    error?: string;
    ok?: boolean;
  });

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-4 text-sm text-green-800">
        Your password has been reset.
        <div className="mt-3">
          <Link href="/login" className="btn-primary text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <ErrorBox message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={6}
          required
        />
      </div>
      <SubmitButton label="Reset password" />
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useFormState(register, { error: undefined } as {
    error?: string;
  });
  return (
    <form action={action} className="space-y-4">
      <ErrorBox message={state?.error} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="firstName">
            First name
          </label>
          <input id="firstName" name="firstName" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            Last name
          </label>
          <input id="lastName" name="lastName" className="input" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Phone
        </label>
        <input id="phone" name="phone" type="tel" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={6}
          required
        />
      </div>
      <SubmitButton label="Create account" />
      <p className="text-center text-sm text-ink-500">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
