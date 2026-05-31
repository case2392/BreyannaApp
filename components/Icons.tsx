// Minimal inline SVG icons (no icon library dependency).
type P = { className?: string };
const base = "h-5 w-5";

export const CalendarIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
  </svg>
);

export const TicketIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
    <path d="M14 6v12" strokeDasharray="2 2" />
  </svg>
);

export const CardIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

export const UserIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
  </svg>
);

export const GridIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const UsersIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    <path d="M16 5a3.5 3.5 0 0 1 0 7M18 20a7 7 0 0 0-3-5.7" strokeLinecap="round" />
  </svg>
);

export const DumbbellIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M6.5 6.5l11 11M4 9l2-2M9 4l-2 2M20 15l-2 2M15 20l2-2" strokeLinecap="round" />
  </svg>
);

export const MegaphoneIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1Z" strokeLinejoin="round" />
    <path d="M18 8a4 4 0 0 1 0 8" strokeLinecap="round" />
    <path d="M7 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3" strokeLinejoin="round" />
  </svg>
);

export const BoltIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
  </svg>
);

export const TagIcon = ({ className = base }: P) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" strokeLinejoin="round" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
