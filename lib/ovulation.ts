import type { DaySymptoms } from '../context/UserDataContext';
import { addDays, daysBetween, formatKey, normalizeNoon } from './date';

export type MarkType = 'period' | 'fertile' | 'ovulation' | null;

function keyToDate(key: string): Date | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  const n = normalizeNoon(dt);
  if (Number.isNaN(n.getTime())) return null;
  return n;
}

export function findOvulationDateForCycle(opts: {
  lastPeriodStart: Date;
  cycleLength: number;
  symptomsByDay: Record<string, DaySymptoms>;
}): Date {
  const { lastPeriodStart, cycleLength, symptomsByDay } = opts;

  const start = normalizeNoon(lastPeriodStart);
  const end = addDays(start, Math.max(1, cycleLength) - 1);

  // עדיפות 1: בדיקת ביוץ חיובית בתוך המחזור הנוכחי
  // אם יש כמה, ניקח את האחרונה (הכי קרוב לביוץ בפועל).
  let lastPositive: Date | null = null;

  for (let i = 0; i <= daysBetween(end, start); i++) {
    const day = addDays(start, i);
    const k = formatKey(day);
    const sym = symptomsByDay[k];

    if (sym?.ovulationTest === 'positive') {
      lastPositive = day;
    }
  }

  if (lastPositive) return lastPositive;

  // fallback: חישוב קלאסי Luteal phase 14 ימים
  const ovuIndex = Math.max(0, cycleLength - 14);
  return addDays(start, ovuIndex);
}

export function buildMarksForGrid(opts: {
  daysGrid: Date[];
  lastPeriodStart: Date;
  cycleLength: number;
  periodLength: number;
  symptomsByDay: Record<string, DaySymptoms>;
}): Map<string, MarkType> {
  const { daysGrid, lastPeriodStart, cycleLength, periodLength, symptomsByDay } = opts;

  const marks = new Map<string, MarkType>();

  if (!lastPeriodStart || !cycleLength || cycleLength <= 0) return marks;

  const lp = normalizeNoon(lastPeriodStart);
  const ovuDate = findOvulationDateForCycle({
    lastPeriodStart: lp,
    cycleLength,
    symptomsByDay,
  });

  const ovuKey = formatKey(ovuDate);
  const ovuDelta = daysBetween(ovuDate, lp);
  const ovuMod = ((ovuDelta % cycleLength) + cycleLength) % cycleLength;

  for (const d of daysGrid) {
    const delta = daysBetween(d, lp);
    const mod = ((delta % cycleLength) + cycleLength) % cycleLength;

    const key = formatKey(d);

    // מחזור
    if (mod >= 0 && mod < periodLength) {
      marks.set(key, 'period');
      continue;
    }

    // ביוץ: או לפי LH positive, או לפי fallback
    if (mod === ovuMod || key === ovuKey) {
      marks.set(key, 'ovulation');
      continue;
    }

    // חלון פוריות סביב יום הביוץ: 4 ימים לפני ועד יום אחרי
    const fertileStart = Math.max(0, ovuMod - 4);
    const fertileEnd = Math.min(cycleLength - 1, ovuMod + 1);

    if (mod >= fertileStart && mod <= fertileEnd) {
      marks.set(key, 'fertile');
      continue;
    }

    marks.set(key, null);
  }

  return marks;
}
