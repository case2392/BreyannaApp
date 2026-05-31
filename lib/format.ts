// Small formatting helpers shared across the app.

export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Group an array by a string key into an ordered Map.
export function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

// Monday 00:00 of the week containing `from`, shifted by `weekOffset` weeks.
export function startOfWeek(from: Date, weekOffset = 0): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0=Sun..6=Sat. Shift so Monday is the first day.
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff + weekOffset * 7);
  return d;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function weekdayShort(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
