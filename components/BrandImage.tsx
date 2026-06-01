"use client";

import { useState } from "react";

// Renders a studio photo from /public/photos when it exists, and a tasteful
// brand-colored panel as a fallback when the file hasn't been added yet.
// This lets the studio drop photos into the repo without any code changes.
export function BrandImage({
  src,
  alt,
  className = "",
  hideOnError = false,
}: {
  src: string;
  alt: string;
  className?: string;
  hideOnError?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed && hideOnError) return null;

  if (failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gradient-to-br from-brand-200 via-sage-200 to-clay-200`}
        aria-label={alt}
      >
        <span className="font-serif text-2xl text-brand-700/70">Dwell</span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}
