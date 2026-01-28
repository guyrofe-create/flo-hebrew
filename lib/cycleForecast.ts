// lib/cycleForecast.ts
import type { DaySymptoms } from '../context/UserDataContext';
import { addDays, formatKey, isoNoonFromKey, normalizeNoon } from './date';

export function isOvulationPositive(v: unknown) {
  if (v === true) return true;

  if (typeof v === 'number') return v === 1;

  if (typeof v !== 'string') return false;

  const s = v.trim().toLowerCase();

  return (
    s === 'positive' ||
    s === 'pos' ||
    s === 'true' ||
    s === 'yes' ||
    s === 'y' ||
    s === '1' ||
    s === 'חיובי' ||
    s === 'כן'
  );
}

export function getLatestPeriodStart(periodHistory: string[] | undefined, periodStart: string | null | undefined): Date | null {
  let best: Date | null = null;

  if (Array.isArray(periodHistory) && periodHistory.length) {
    for (const iso of periodHistory) {
      const d = normalizeNoon(new Date(iso));
      if (Number.isNaN(d.getTime())) continue;
      if (!best || d.getTime() > best.getTime()) best = d;
    }
  }

  if (periodStart) {
    const d = normalizeNoon(new Date(periodStart));
    if (!Number.isNaN(d.getTime())) {
      if (!best || d.getTime() > best.getTime()) best = d;
    }
  }

  return best;
}

function parseNoonFromDayKey(key: string): Date | null {
  try {
    const d = normalizeNoon(new Date(isoNoonFromKey(key)));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export function findLatestPositiveOvulationInCurrentCycle(
  symptomsByDay: Record<string, DaySymptoms> | undefined,
  lastPeriodStart: Date | null,
  cycleLength: number
): { date: Date; key: string } | null {
  if (!symptomsByDay || !lastPeriodStart || !cycleLength || cycleLength <= 0) return null;

  const start = normalizeNoon(lastPeriodStart);
  const end = normalizeNoon(addDays(start, cycleLength));

  let best: { date: Date; key: string } | null = null;

  for (const key of Object.keys(symptomsByDay)) {
    const sym = symptomsByDay[key];
    if (!sym) continue;
    if (!isOvulationPositive(sym.ovulationTest)) continue;

    const d = parseNoonFromDayKey(key);
    if (!d) continue;

    if (d.getTime() < start.getTime() || d.getTime() >= end.getTime()) continue;

    if (!best || d.getTime() > best.date.getTime()) best = { date: d, key };
  }

  return best;
}

export type CycleForecast = {
  today: Date;
  lastPeriodStart: Date | null;
  computedPeriodEnd: Date | null;

  latestPositiveOvulation: { date: Date; key: string } | null;

  ovulationDate: Date | null;
  ovulationKey: string | null;

  fertileWindow: { start: Date; end: Date } | null;

  nextPeriodStart: Date | null;
  cycleDayNumber: number | null;

  isInFertileWindow: boolean;
  inPeriodByCalc: boolean;
};

export function computeCycleForecast(args: {
  today?: Date;
  periodHistory?: string[];
  periodStart?: string | null;
  cycleLength: number;
  periodLength: number;
  symptomsByDay?: Record<string, DaySymptoms>;
}): CycleForecast {
  const today = normalizeNoon(args.today ?? new Date());
  const lastPeriodStart = getLatestPeriodStart(args.periodHistory, args.periodStart);

  const cycleLength = args.cycleLength;
  const periodLength = args.periodLength;

  const computedPeriodEnd =
    lastPeriodStart && periodLength && periodLength > 0
      ? normalizeNoon(addDays(lastPeriodStart, Math.max(0, periodLength - 1)))
      : null;

  const latestPositiveOvulation = findLatestPositiveOvulationInCurrentCycle(args.symptomsByDay, lastPeriodStart, cycleLength);

  const ovulationDate = (() => {
    if (latestPositiveOvulation) return latestPositiveOvulation.date;

    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return null;
    const ovuIndex = Math.max(0, cycleLength - 14);
    return normalizeNoon(addDays(lastPeriodStart, ovuIndex));
  })();

  const ovulationKey = ovulationDate ? formatKey(ovulationDate) : null;

  const fertileWindow = (() => {
    if (!ovulationDate) return null;
    const start = normalizeNoon(addDays(ovulationDate, -4));
    const end = normalizeNoon(addDays(ovulationDate, 1));
    return { start, end };
  })();

  const nextPeriodStart = (() => {
    if (latestPositiveOvulation) return normalizeNoon(addDays(latestPositiveOvulation.date, 14));

    if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return null;
    return normalizeNoon(addDays(lastPeriodStart, cycleLength));
  })();

  const cycleDayNumber = (() => {
    if (!lastPeriodStart) return null;
    const diffDays = Math.floor((today.getTime() - lastPeriodStart.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 ? diffDays + 1 : null;
  })();

  const isInFertileWindow = (() => {
    if (!fertileWindow) return false;
    return today.getTime() >= fertileWindow.start.getTime() && today.getTime() <= fertileWindow.end.getTime();
  })();

  const inPeriodByCalc = (() => {
    if (!lastPeriodStart || !periodLength || periodLength <= 0) return false;
    const end = normalizeNoon(addDays(lastPeriodStart, Math.max(0, periodLength - 1)));
    return today.getTime() >= lastPeriodStart.getTime() && today.getTime() <= end.getTime();
  })();

  return {
    today,
    lastPeriodStart,
    computedPeriodEnd,
    latestPositiveOvulation,
    ovulationDate,
    ovulationKey,
    fertileWindow,
    nextPeriodStart,
    cycleDayNumber,
    isInFertileWindow,
    inPeriodByCalc,
  };
}
