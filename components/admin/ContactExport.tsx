"use client";

import { useEffect, useRef, useState } from "react";
import { formatPhone, toE164 } from "@/lib/phone";

export type Contact = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

// Copy everyone's emails or phone numbers in one click, or download them as a
// spreadsheet (emails, phone numbers, or both) that opens in Excel, Numbers or
// Google Sheets and imports into Mailchimp, phone contacts, etc.
export function ContactExport({
  contacts,
  fileLabel = "members",
}: {
  contacts: Contact[];
  fileLabel?: string;
}) {
  const [copied, setCopied] = useState<"emails" | "phones" | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const emails = unique(contacts.map((c) => c.email?.trim().toLowerCase() ?? ""));
  // De-duplicate by the real number so "402-555-1234" and "(402) 555-1234"
  // count once.
  const phoneMap = new Map<string, string>();
  for (const c of contacts) {
    if (!c.phone?.trim()) continue;
    const key = toE164(c.phone) ?? c.phone.trim();
    if (!phoneMap.has(key)) phoneMap.set(key, formatPhone(c.phone));
  }
  const phones = Array.from(phoneMap.values());

  // Close the download menu on outside click / Escape.
  useEffect(() => {
    if (!menu) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  async function copy(kind: "emails" | "phones") {
    const text = (kind === "emails" ? emails : phones).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt(`Copy these ${kind === "emails" ? "emails" : "phone numbers"}:`, text);
    }
  }

  // Spreadsheet rows: one per person who has that detail.
  const rowsFor = (kind: "emails" | "phones" | "both") =>
    contacts.filter((c) =>
      kind === "emails"
        ? c.email?.trim()
        : kind === "phones"
        ? c.phone?.trim()
        : c.email?.trim() || c.phone?.trim()
    );
  const rowCount = (kind: "emails" | "phones" | "both") => rowsFor(kind).length;

  function download(kind: "emails" | "phones" | "both") {
    setMenu(false);
    const rows = rowsFor(kind);
    const header = [
      "First name",
      "Last name",
      ...(kind !== "phones" ? ["Email"] : []),
      ...(kind !== "emails" ? ["Phone"] : []),
    ];
    const lines = [
      header,
      ...rows.map((c) => [
        c.firstName,
        c.lastName,
        ...(kind !== "phones" ? [c.email?.trim() ?? ""] : []),
        ...(kind !== "emails" ? [formatPhone(c.phone)] : []),
      ]),
    ].map((r) => r.map(csvCell).join(","));
    // The BOM makes Excel read names with accents correctly.
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const name =
      kind === "both" ? "emails-and-phones" : kind === "emails" ? "emails" : "phone-numbers";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dwell-${fileLabel}-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => copy("emails")}
        disabled={emails.length === 0}
        className="btn-secondary text-sm"
      >
        {copied === "emails" ? "Copied ✓" : `Copy emails (${emails.length})`}
      </button>
      <button
        type="button"
        onClick={() => copy("phones")}
        disabled={phones.length === 0}
        className="btn-secondary text-sm"
      >
        {copied === "phones" ? "Copied ✓" : `Copy phone numbers (${phones.length})`}
      </button>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-haspopup="menu"
          className="btn-secondary text-sm"
        >
          Download ▾
        </button>
        {menu && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 text-sm shadow-lift"
          >
            <MenuItem onClick={() => download("emails")} count={rowCount("emails")}>
              Emails
            </MenuItem>
            <MenuItem onClick={() => download("phones")} count={rowCount("phones")}>
              Phone numbers
            </MenuItem>
            <MenuItem onClick={() => download("both")} count={rowCount("both")}>
              Emails + phone numbers
            </MenuItem>
            <p className="border-t border-ink-100 px-3 py-2 text-xs text-ink-500">
              Downloads a spreadsheet (.csv) with names, for Excel, Google Sheets
              or Mailchimp.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  onClick,
  count,
  children,
}: {
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={count === 0}
      className="flex w-full items-center justify-between px-3 py-2 text-left text-ink-800 hover:bg-ink-50 disabled:opacity-50"
    >
      <span>{children}</span>
      <span className="text-xs text-ink-500">{count}</span>
    </button>
  );
}

function unique(list: string[]) {
  return Array.from(new Set(list.filter(Boolean)));
}

// Quote a CSV cell; a leading = + - @ is neutralised so spreadsheet apps don't
// treat a value as a formula.
function csvCell(v: string) {
  let s = v ?? "";
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
