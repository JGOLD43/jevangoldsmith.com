export interface ConsumptionTime {
  minutes: number;
  provisional: boolean;
  scope: 'full' | 'first-visit';
  basis: string;
}

export function parseDuration(value?: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const clock = normalized.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    const minutes = clock[3] ? Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3]) / 60 : Number(clock[1]) + Number(clock[2]) / 60;
    return minutes > 0 ? Math.ceil(minutes) : null;
  }
  let minutes = 0;
  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/g)) {
    minutes += Number(match[1]) * (match[2].startsWith('h') ? 60 : 1);
  }
  return minutes > 0 ? Math.ceil(minutes) : null;
}

export function formatConsumptionTime(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${total} min`;
}

export function consumptionTime(item: { kind: string; title: string; duration?: string | null; pages?: number; wordCount?: number }): ConsumptionTime {
  const recorded = parseDuration(item.duration);
  if (recorded) return { minutes: recorded, provisional: false, scope: 'full', basis: 'Uses the duration recorded in the library. Reading pace and playback speed may vary.' };
  if (item.wordCount && item.wordCount > 0) return { minutes: Math.ceil(item.wordCount / 225), provisional: false, scope: 'full', basis: 'Estimated at 225 words per minute.' };
  if (item.pages && item.pages > 0) return { minutes: Math.ceil(item.pages * 1.2 / 5) * 5, provisional: false, scope: 'full', basis: `Estimated from ${item.pages} pages at 50 pages per hour, rounded up to five minutes.` };
  if (/collection|collected works|resources|prompt library|reading the room/i.test(item.title)) {
    return { minutes: 30, provisional: true, scope: 'first-visit', basis: 'A 30-minute first visit to an open-ended resource, not completion of every linked item. Category totals include this first visit.' };
  }
  if (/series|trilogy|parts unknown|the last dance|^tiger$|jeen-yuhs/i.test(item.title)) {
    return { minutes: 600, provisional: true, scope: 'full', basis: 'A rough 10-hour planning allowance for a series. Its full episode runtimes have not yet been recorded.' };
  }
  const defaults: Record<string, [number, string]> = {
    book: [360, 'A rough 6-hour reading allowance (300 pages at 50 pages per hour). This book’s page count has not yet been recorded.'],
    documentary: [90, 'A rough 90-minute allowance for a feature documentary. Its runtime has not yet been recorded.'],
    interview: [45, 'A rough 45-minute allowance for an interview. Its duration has not yet been recorded.'],
    video: [20, 'A rough 20-minute allowance for a video. Its runtime has not yet been recorded.'],
    article: [10, 'A rough 10-minute reading allowance. A word count has not yet been recorded.'],
    art: [10, 'A rough 10-minute allowance to read or explore this piece.'],
    memo: [15, 'A rough 15-minute reading allowance. A word count has not yet been recorded.'],
    other: [20, 'A rough 20-minute allowance to read or explore this piece.'],
  };
  const [minutes, basis] = defaults[item.kind] || defaults.other;
  return { minutes, provisional: true, scope: 'full', basis };
}

// Call with the filtered list: overlapping collections must never count an item twice.
export function totalConsumptionTime(items: { id: string; consumptionMinutes: number }[]): number {
  const unique = new Map(items.map((item) => [item.id, item.consumptionMinutes]));
  return [...unique.values()].reduce((sum, minutes) => sum + minutes, 0);
}
