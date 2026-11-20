import type { AppLanguage, CityTimeZone, CurrencyCode } from '../types/cinema';

/**
 * Locale-aware formatting helpers using standard ECMAScript Intl APIs (`en-AU` / `zh-CN`).
 * Strictly avoids hardcoded currency symbols, date string concatenation, or unit literals.
 */

const audCurrencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const audWholeCurrencyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const cnyCurrencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const kilometerFormatter = new Intl.NumberFormat('en-AU', {
  style: 'unit',
  unit: 'kilometer',
  unitDisplay: 'short',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-AU', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const tenPointScoreFormatter = new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const compactCountFormatter = new Intl.NumberFormat('en-AU', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const exactCountFormatter = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0,
});

const hourUnitFormatter = new Intl.NumberFormat('en-AU', {
  style: 'unit',
  unit: 'hour',
  unitDisplay: 'narrow',
});

const minuteUnitFormatter = new Intl.NumberFormat('en-AU', {
  style: 'unit',
  unit: 'minute',
  unitDisplay: 'narrow',
});

export function formatAud(amount: number, compactWhole = false): string {
  if (compactWhole && Number.isInteger(amount)) {
    return audWholeCurrencyFormatter.format(amount);
  }
  return audCurrencyFormatter.format(amount);
}

export function formatSessionPrice(
  amount: number,
  currency: CurrencyCode = 'AUD',
  compactWhole = false
): string {
  if (currency === 'CNY') {
    return cnyCurrencyFormatter.format(amount);
  }
  return formatAud(amount, compactWhole);
}

export function formatDistanceKm(kilometers: number): string {
  return kilometerFormatter.format(kilometers);
}

export function formatPercent(score0to100: number): string {
  return percentFormatter.format(score0to100 / 100);
}

export function formatTenPointScore(score0to10: number): string {
  return tenPointScoreFormatter.format(score0to10);
}

export function formatCompactCount(count: number): string {
  return compactCountFormatter.format(count);
}

export function formatExactCount(count: number): string {
  return exactCountFormatter.format(count);
}

export function formatRuntime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) {
    return minuteUnitFormatter.format(mins);
  }
  if (mins === 0) {
    return hourUnitFormatter.format(hours);
  }
  return `${hourUnitFormatter.format(hours)} ${minuteUnitFormatter.format(mins)}`;
}

/**
 * Formats an ISO YYYY-MM-DD calendar date in Australian English for date strip buttons.
 */
export function formatCalendarChipParts(
  dateIso: string,
  timeZone: CityTimeZone,
  lang: AppLanguage = 'en'
): { weekdayShort: string; dayMonthShort: string; fullLabel: string } {
  const [year, month, day] = dateIso.split('-').map(Number);
  // 02:00 UTC guarantees AU (+10/+11) and Shanghai (+8) stay on the exact intended calendar day
  const safeUtcAnchor = new Date(Date.UTC(year, month - 1, day, 2, 0, 0));
  const locale = lang === 'zh' ? 'zh-CN' : 'en-AU';

  const weekdayShort = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone,
  }).format(safeUtcAnchor);

  const dayMonthShort = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(safeUtcAnchor);

  const fullLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(safeUtcAnchor);

  return { weekdayShort, dayMonthShort, fullLabel };
}

/**
 * Formats minutes-from-midnight (e.g. 1155 -> "7:15 pm") using Intl.DateTimeFormat.
 */
export function formatTimeFromMinutes(minutesFromMidnight: number): string {
  const normalized = ((minutesFromMidnight % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const refDate = new Date(Date.UTC(2026, 0, 1, hours, mins, 0));
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(refDate);
}

/**
 * Computes estimated session end time (including 15 minutes of previews/trailers).
 */
export function formatSessionWindow(
  startMinutesFromMidnight: number,
  runtimeMinutes: number,
  trailerBufferMinutes = 15
): { startFormatted: string; finishFormatted: string; nextDay: boolean } {
  const finishTotal = startMinutesFromMidnight + runtimeMinutes + trailerBufferMinutes;
  return {
    startFormatted: formatTimeFromMinutes(startMinutesFromMidnight),
    finishFormatted: formatTimeFromMinutes(finishTotal),
    nextDay: finishTotal >= 1440,
  };
}

/**
 * Formats an upcoming release date (YYYY-MM-DD) in Australian English, e.g. "26 November 2026".
 */
export function formatAustralianReleaseDate(
  dateIso: string,
  timeZone: CityTimeZone
): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const safeUtcAnchor = new Date(Date.UTC(year, month - 1, day, 2, 0, 0));
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(safeUtcAnchor);
}

/**
 * Computes whole days between local today (YYYY-MM-DD) and an upcoming release date (YYYY-MM-DD).
 */
export function getDaysUntilRelease(
  releaseDateIso: string,
  timeZone: CityTimeZone
): number {
  const todayIso = getLocalTodayIso(timeZone);
  const [ty, tm, td] = todayIso.split('-').map(Number);
  const [ry, rm, rd] = releaseDateIso.split('-').map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const releaseMs = Date.UTC(ry, rm - 1, rd);
  return Math.max(0, Math.round((releaseMs - todayMs) / 86_400_000));
}

/**
 * Machine-readable YYYY-MM-DD extraction anchored to a specific city timezone.
 * Note: Strictly for internal date-key matching, never displayed raw to end users.
 */
export function getLocalTodayIso(timeZone: CityTimeZone): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '11';
  const day = parts.find((p) => p.type === 'day')?.value ?? '14';
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current local time in minutes from midnight (0–1439) for Melbourne, Sydney, or Shanghai.
 */
export function getLocalCurrentMinutesFromMidnight(
  timeZone: CityTimeZone
): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(new Date());

  const hourRaw = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minRaw = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const hour = Number.isFinite(hourRaw) ? hourRaw % 24 : 0;
  const min = Number.isFinite(minRaw) ? minRaw : 0;
  return hour * 60 + min;
}
