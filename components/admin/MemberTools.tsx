"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  createMember,
  grantMembershipToMember,
  removeMembership,
  resetMemberPassword,
  deleteMember,
} from "@/app/actions/admin";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function AddMemberForm() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [state, action] = useFormState(
    async (prev: unknown, fd: FormData) => {
      const res = await createMember(prev, fd);
      if (res?.ok) setDone(true);
      return res;
    },
    {} as { error?: string; ok?: boolean }
  );

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        + Add member
      </button>
    );
  }

  return (
    <div className="card mb-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Add a member</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-ink-500">
          Close
        </button>
      </div>
      {done ? (
        <div className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">
          Member added. Share their email + the temporary password so they can
          sign in — they can change it under Account.
          <div className="mt-2">
            <button
              onClick={() => {
                setDone(false);
              }}
              className="btn-secondary text-xs"
            >
              Add another
            </button>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input name="firstName" className="input" required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input name="lastName" className="input" required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input name="phone" type="tel" className="input" />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input name="password" className="input" defaultValue="dwell123" minLength={6} required />
            <p className="mt-1 text-xs text-ink-400">
              You&apos;ll share this so they can sign in; they can change it after.
            </p>
          </div>
          <Submit label="Add member" />
        </form>
      )}
    </div>
  );
}

type PlanOpt = { id: string; name: string };

export function GrantMembership({
  userId,
  plans,
}: {
  userId: string;
  plans: PlanOpt[];
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [source, setSource] = useState<"COMP" | "GIFT">("COMP");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function grant() {
    if (!planId) return;
    setMsg(null);
    start(async () => {
      const res = await grantMembershipToMember(userId, planId, source);
      if (res.ok) {
        setMsg("Membership granted — it won't expire until you remove it.");
        router.refresh();
      } else {
        setMsg(res.error ?? "Something went wrong.");
      }
    });
  }

  if (plans.length === 0)
    return <p className="text-sm text-ink-500">Add a plan first to grant memberships.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Grant a membership</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="input"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "COMP" | "GIFT")}
            className="input"
          >
            <option value="COMP">Complimentary</option>
            <option value="GIFT">Gift (Sponsor a Sister)</option>
          </select>
        </div>
        <button onClick={grant} disabled={pending} className="btn-primary text-sm">
          {pending ? "Granting…" : "Grant"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-ink-500">{msg}</p>}
    </div>
  );
}

export function RemoveMembershipButton({ membershipId }: { membershipId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (!confirm("Remove this membership? The member loses access to it.")) return;
    start(async () => {
      const res = await removeMembership(membershipId);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="text-xs font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function ResetMemberPassword({ userId }: { userId: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await resetMemberPassword(userId, value);
      if (res.ok) setMsg("Password set — share it with the member.");
      else setMsg(res.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label">Set a temporary password</label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          placeholder="e.g. dwell123"
          minLength={6}
        />
      </div>
      <button
        onClick={submit}
        disabled={pending || value.length < 6}
        className="btn-secondary text-sm"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
      {msg && <span className="text-xs text-ink-500">{msg}</span>}
    </div>
  );
}

export function DeleteMemberButton({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (
      !confirm(
        "Remove this member? This deletes their account, bookings and memberships. This can't be undone."
      )
    )
      return;
    start(async () => {
      const res = await deleteMember(userId);
      if (res.ok) router.push("/admin/members");
      else alert(res.error);
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="text-sm font-medium text-ink-400 hover:text-red-600"
    >
      {pending ? "Removing…" : "Remove member"}
    </button>
  );
}
