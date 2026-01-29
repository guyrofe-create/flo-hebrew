import { addDays } from './date';

export function getOvulationDay({
  opkPositiveDay,
  avgCycleLength,
  lastPeriodStart,
}: {
  opkPositiveDay?: Date | null;
  avgCycleLength?: number | null;
  lastPeriodStart?: Date | null;
}) {
  // עדיפות 1 – בדיקת ביוץ חיובית
  if (opkPositiveDay) {
    return opkPositiveDay; // אפשר גם addDays(opkPositiveDay, 1)
  }

  // עדיפות 2 – חישוב לפי אורך מחזור
  if (avgCycleLength && lastPeriodStart) {
    return addDays(lastPeriodStart, avgCycleLength - 14);
  }

  return null;
}

export function getFertileWindow(ovulationDay: Date | null) {
  if (!ovulationDay) return null;

  return {
    start: addDays(ovulationDay, -5),
    end: ovulationDay,
  };
}
