"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfile, changePassword } from "@/app/actions/account";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Feedback({ state }: { state: { error?: string; message?: string } }) {
  if (state?.error)
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        {state.message}
      </p>
    );
  return null;
}

export function EditProfileForm({
  firstName,
  lastName,
  email,
  phone,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const [state, action] = useFormState(updateProfile, {} as any);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First name</label>
          <input name="firstName" defaultValue={firstName} className="input" required />
        </div>
        <div>
          <label className="label">Last name</label>
          <input name="lastName" defaultValue={lastName} className="input" required />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" defaultValue={email} className="input" required />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" type="tel" defaultValue={phone} className="input" />
      </div>
      <SaveButton label="Save changes" />
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useFormState(changePassword, {} as any);
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <div>
        <label className="label">Current password</label>
        <input name="current" type="password" className="input" required />
      </div>
      <div>
        <label className="label">New password</label>
        <input name="next" type="password" className="input" minLength={6} required />
      </div>
      <SaveButton label="Change password" />
    </form>
  );
}
