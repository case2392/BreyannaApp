"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, register } from "@/app/actions/auth";

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

export function LoginForm() {
  const [state, action] = useFormState(login, { error: undefined } as {
    error?: string;
  });
  return (
    <form action={action} className="space-y-4">
      <ErrorBox message={state?.error} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" required />
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
          Phone (optional)
        </label>
        <input id="phone" name="phone" type="tel" className="input" />
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
