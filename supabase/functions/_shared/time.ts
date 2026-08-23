// Timezone-aware meet-window computation. MVP assumes one launch region,
// configured via the MEETCUTE_TZ env on the edge functions.

function tzOffsetMinutes(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUTC - date.getTime()) / 60000;
}

/**
 * The meet-cute window: tomorrow (in `tz`), starting at `hourLocal`,
 * lasting `durationMin` minutes. E.g. "tomorrow, 6-7 PM".
 */
export function nextEveningWindow(
  tz: string,
  hourLocal = 18,
  durationMin = 60,
  from: Date = new Date(),
): { start: Date; end: Date } {
  const tomorrow = new Date(from.getTime() + 24 * 3600 * 1000);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = fmt.format(tomorrow); // YYYY-MM-DD in tz
  const naive = new Date(`${dateStr}T${String(hourLocal).padStart(2, '0')}:00:00Z`);
  // correct the naive UTC guess by the tz offset at that instant
  const start = new Date(naive.getTime() - tzOffsetMinutes(tz, naive) * 60000);
  return { start, end: new Date(start.getTime() + durationMin * 60000) };
}

/** The local weekday (0=Sunday) for the next calendar day in `tz`. */
export function nextLocalWeekday(tz: string, from: Date = new Date()): number {
  const tomorrow = new Date(from.getTime() + 24 * 3600 * 1000);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).format(tomorrow);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}
