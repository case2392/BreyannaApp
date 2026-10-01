"use client";

import { useState } from "react";

// Copies a list of emails to the clipboard (comma-separated) with one click.
export function CopyEmailsButton({
  emails,
  label = "Copy emails",
  className = "btn-secondary text-sm",
}: {
  emails: string[];
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const list = Array.from(new Set(emails.map((e) => e.trim()).filter(Boolean)));

  async function copy() {
    try {
      await navigator.clipboard.writeText(list.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: open a prompt the user can copy from manually.
      window.prompt("Copy these emails:", list.join(", "));
    }
  }

  return (
    <button type="button" onClick={copy} disabled={list.length === 0} className={className}>
      {copied ? "Copied ✓" : `${label} (${list.length})`}
    </button>
  );
}
