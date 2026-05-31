import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
        B
      </span>
      <span className="text-lg font-bold tracking-tight text-ink-900">
        Breyanna<span className="text-brand-600"> Fitness</span>
      </span>
    </Link>
  );
}
