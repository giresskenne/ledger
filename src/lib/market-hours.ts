// Market hours utilities
// Used to show a simple “market open/closed” indicator for listed assets.
// Note: This is an approximation (no holiday calendar).

export type MarketStatus = {
  isOpen: boolean;
  statusLabel: string;
  detailLabel: string;
};

type MarketSchedule = {
  timeZone: string;
  openMinutes: number; // minutes since midnight in the market’s local time
  closeMinutes: number; // minutes since midnight in the market’s local time
  label: string;
};

const MARKET_SCHEDULES: Record<string, MarketSchedule> = {
  // US/Canada equities (approx NYSE/Nasdaq)
  US: { timeZone: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60, label: 'US market' },
  CA: { timeZone: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60, label: 'CA market' },

  // UK (approx LSE)
  UK: { timeZone: 'Europe/London', openMinutes: 8 * 60, closeMinutes: 16 * 60 + 30, label: 'UK market' },

  // Major EU (approx Xetra / Euronext)
  DE: { timeZone: 'Europe/Berlin', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30, label: 'EU market' },
  FR: { timeZone: 'Europe/Paris', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30, label: 'EU market' },
  CH: { timeZone: 'Europe/Zurich', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30, label: 'CH market' },

  // Japan (approx TSE, ignoring lunch break)
  JP: { timeZone: 'Asia/Tokyo', openMinutes: 9 * 60, closeMinutes: 15 * 60, label: 'JP market' },

  // Brazil (approx B3)
  BR: { timeZone: 'America/Sao_Paulo', openMinutes: 10 * 60, closeMinutes: 17 * 60, label: 'BR market' },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatDurationShort(totalMinutes: number) {
  const minutes = clamp(Math.round(totalMinutes), 0, 24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const weekday = get('weekday'); // Mon, Tue, ...
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const tzName = get('timeZoneName') || timeZone;

  return { weekday, hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0, tzName };
}

function isWeekend(weekday: string) {
  return weekday === 'Sat' || weekday === 'Sun';
}

function weekdayIndex(weekday: string) {
  // Mon..Sun
  switch (weekday) {
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    case 'Sun': return 0;
    default: return -1;
  }
}

/**
 * Returns an approximate market status for a given country code.
 * This intentionally avoids a holiday calendar to keep the dependency surface small.
 */
export function getMarketStatus(countryCode?: string, now: Date = new Date()): MarketStatus | null {
  if (!countryCode) return null;
  const schedule = MARKET_SCHEDULES[countryCode];
  if (!schedule) return null;

  const { weekday, hour, minute, tzName } = getZonedParts(now, schedule.timeZone);
  const minutesNow = hour * 60 + minute;

  // Weekends: always closed
  if (isWeekend(weekday)) {
    return {
      isOpen: false,
      statusLabel: 'Market closed',
      detailLabel: `Reopens Monday (${schedule.label})`,
    };
  }

  // Open session
  if (minutesNow >= schedule.openMinutes && minutesNow < schedule.closeMinutes) {
    const remaining = schedule.closeMinutes - minutesNow;
    return {
      isOpen: true,
      statusLabel: 'Market open',
      detailLabel: `Closes in ${formatDurationShort(remaining)} (${tzName})`,
    };
  }

  // Before open
  if (minutesNow < schedule.openMinutes) {
    const untilOpen = schedule.openMinutes - minutesNow;
    return {
      isOpen: false,
      statusLabel: 'Market closed',
      detailLabel: `Opens in ${formatDurationShort(untilOpen)} (${tzName})`,
    };
  }

  // After close
  const dayIdx = weekdayIndex(weekday);
  const daysToNext = dayIdx === 5 ? 3 : 1; // Fri -> Mon, otherwise next day
  return {
    isOpen: false,
    statusLabel: 'Market closed',
    detailLabel: `Reopens in ${daysToNext} day${daysToNext === 1 ? '' : 's'} (${schedule.label})`,
  };
}

