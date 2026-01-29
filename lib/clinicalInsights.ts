// lib/clinicalInsights.ts
import { normalizeNoon } from './date';

export type ClinicalFlagType =
  | 'short_cycles'
  | 'long_cycles'
  | 'prolonged_bleeding'
  | 'no_period';

export type ClinicalFlag = {
  type: ClinicalFlagType;
  title: string;
  message: string;
  severity: 'info' | 'suggest';
};

function daysBetween(a: Date, b: Date) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const aa = normalizeNoon(a).getTime();
  const bb = normalizeNoon(b).getTime();
  return Math.round((bb - aa) / MS_PER_DAY);
}

function sortedOldest(periodStartsIso: string[]) {
  return [...periodStartsIso]
    .filter(Boolean)
    .filter(s => !Number.isNaN(new Date(s).getTime()))
    .sort((x, y) => new Date(x).getTime() - new Date(y).getTime());
}

function computeCycleDiffs(periodStartsIso: string[]) {
  const s = sortedOldest(periodStartsIso);
  const diffs: number[] = [];
  for (let i = 1; i < s.length; i++) {
    const prev = new Date(s[i - 1]);
    const curr = new Date(s[i]);
    const d = daysBetween(prev, curr);
    if (d > 0) diffs.push(d);
  }
  return diffs;
}

function median(values: number[]) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 0 ? (v[mid - 1] + v[mid]) / 2 : v[mid];
}

function countWhere(values: number[], pred: (n: number) => boolean) {
  let c = 0;
  for (const n of values) if (pred(n)) c += 1;
  return c;
}

function latestDate(periodStartsIso: string[]): Date | null {
  if (!periodStartsIso?.length) return null;
  let best: Date | null = null;
  for (const iso of periodStartsIso) {
    const d = normalizeNoon(new Date(iso));
    if (Number.isNaN(d.getTime())) continue;
    if (!best || d.getTime() > best.getTime()) best = d;
  }
  return best;
}

export function computeClinicalInsights(args: {
  today?: Date;
  periodHistory: string[];
  periodStart?: string | null;
  periodLength: number;
}): ClinicalFlag[] {
  const today = normalizeNoon(args.today ?? new Date());

  const starts = [
    ...(Array.isArray(args.periodHistory) ? args.periodHistory : []),
    ...(args.periodStart ? [args.periodStart] : []),
  ];

  const flags: ClinicalFlag[] = [];

  // thresholds (MVP)
  const SHORT_CYCLE_LT = 21; // days
  const LONG_CYCLE_GT = 35; // days
  const PROLONGED_BLEEDING_GT = 8; // days
  const NO_PERIOD_GT = 45; // days since last start

  // 1) cycle length abnormality
  const diffsAll = computeCycleDiffs(starts);

  // נתמקד ב 5 האחרונים כדי לזהות "דפוס אחרון"
  const diffs = diffsAll.slice(-5);

  if (diffs.length >= 2) {
    const med = median(diffsAll);
    const shortCount = countWhere(diffs, d => d < SHORT_CYCLE_LT);
    const longCount = countWhere(diffs, d => d > LONG_CYCLE_GT);

    // דפוס:
    // אם יש 2 מדידות בלבד, צריך ששתי המדידות יהיו חריגות באותו כיוון
    // אם יש 3+, מספיק 2 מתוך 3-5 האחרונים
    const need = diffs.length === 2 ? 2 : 2;

    if (shortCount >= need) {
      flags.push({
        type: 'short_cycles',
        severity: 'suggest',
        title: 'מחזורים קצרים מהרגיל',
        message:
          'נראה שיש כמה מחזורים קצרים מאוד לאחרונה. אם זה דפוס שחוזר, שווה לשקול ייעוץ רפואי או מעקב נוסף.',
      });
    }

    if (longCount >= need) {
      flags.push({
        type: 'long_cycles',
        severity: 'suggest',
        title: 'מחזורים ארוכים מהרגיל',
        message:
          'נראה שיש כמה מחזורים ארוכים מאוד לאחרונה. אם זה דפוס שחוזר, שווה לשקול ייעוץ רפואי או מעקב נוסף.',
      });
    }

    // flag עדין על median קיצוני, רק אם יש מספיק נתונים
    if (med !== null && (med < 22 || med > 34) && diffsAll.length >= 3) {
      flags.push({
        type: med < 22 ? 'short_cycles' : 'long_cycles',
        severity: 'info',
        title: 'אורך מחזור לא טיפוסי',
        message:
          'אורך המחזור הממוצע אצלך נראה לא טיפוסי. זה לא אומר שיש בעיה, אבל אם יש תסמינים נוספים או שינוי חדש, כדאי מעקב.',
      });
    }
  }

  // 2) prolonged bleeding (based on configured periodLength for now)
  if (Number.isFinite(args.periodLength) && args.periodLength > PROLONGED_BLEEDING_GT) {
    flags.push({
      type: 'prolonged_bleeding',
      severity: 'info',
      title: 'דימום ממושך',
      message: 'מוגדר אצלך אורך וסת ארוך יחסית. אם בפועל מדובר בדימום ממושך או חריג, שווה מעקב רפואי.',
    });
  }

  // 3) no period (time since last start)
  const lastStart = latestDate(starts);
  if (lastStart) {
    const since = daysBetween(lastStart, today);
    if (since > NO_PERIOD_GT) {
      flags.push({
        type: 'no_period',
        severity: 'suggest',
        title: 'איחור משמעותי במחזור',
        message: 'נראה שעבר זמן ממושך מאז תחילת המחזור האחרונה. אם זה לא צפוי עבורך, שווה לשקול בדיקה או ייעוץ רפואי.',
      });
    }
  }

  return flags;
}
