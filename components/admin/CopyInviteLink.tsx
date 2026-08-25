"use client";

import { useEffect, useState } from "react";

// Shows a private class's invite link and copies it to the clipboard. Builds
// the URL from the current origin so it works on any domain.
export function CopyInviteLink({ token }: { token: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/c/${token}`);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        aria-label="Invite link"
        onFocus={(e) => e.currentTarget.select()}
        className="input flex-1 text-xs"
      />
      <button type="button" onClick={copy} className="btn-secondary text-sm">
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
