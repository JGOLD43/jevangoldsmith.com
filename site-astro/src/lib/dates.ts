// Shared date formatters. Each script that previously re-implemented one
// of these now imports it from here.
//
// The formats are intentionally simple — locale-aware where Intl helps
// (`formatDate`), but plain string slicing where the input is a known
// ISO date and we want byte-for-byte stable output (`monthKey`).

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// "Mar 2024" / "Mar - May 2024" / "Mar 2023 - May 2024"
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return start.toLocaleDateString('en-US', options);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', options)}`;
  }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

// "1h 23m" / "23 min" — Letterboxd-style runtime from a minutes count.
export function formatRuntime(minutes: number): string {
  const total = Number(minutes) || 0;
  if (total <= 0) return '';
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// "1h 23m" / "23 min" — same shape but takes ms (Spotify episodes).
export function formatEpisodeDuration(ms: number): string {
  if (!ms || typeof ms !== 'number' || ms <= 0) return '';
  return formatRuntime(Math.round(ms / 60000));
}

// "today" / "yesterday" / "3 days ago" / "Mar 14, 2024"
export function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const day = 86400000;
  if (diffMs < day) return 'today';
  if (diffMs < day * 2) return 'yesterday';
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)} days ago`;
  if (diffMs < day * 30) return `${Math.floor(diffMs / (day * 7))} wk ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "2024-03" — assumes ISO YYYY-MM-DD prefix.
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

// "2024-03-14" → "Mar 14"
export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}
