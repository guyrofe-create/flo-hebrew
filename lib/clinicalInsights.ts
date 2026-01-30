// lib/clinicalInsights.ts
import type { DaySymptoms, PhysioMode } from '../context/UserDataContext';
import { normalizeNoon } from './date';

export type ClinicalFlagType =
  | 'short_cycles'
  | 'long_cycles'
  | 'prolonged_bleeding'
  | 'bleeding_longer_than_config'
  | 'intermenstrual_bleeding'
  | 'no_period';

export type ClinicalFlag = {
  type: ClinicalFlagType;
  title: string;
  message: string;
  severity: 'info' | 'suggest';
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date) {
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

function keyToDate(dayKey: string): Date | null {
  if (!dayKey) return null;
  const d = normalizeNoon(new Date(dayKey));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateToKey(d: Date): string {
  const nd = normalizeNoon(d);
  return nd.toISOString().slice(0, 10);
}

function addDaysKey(dayKey: string, days: number): string | null {
  const d = keyToDate(dayKey);
  if (!d) return null;
  return dateToKey(new Date(d.getTime() + days * MS_PER_DAY));
}

function isBleedingDay(sym: DaySymptoms | undefined): boolean {
  if (!sym) return false;
  return sym.flow !== undefined && sym.flow !== 'none';
}

function isLightOnly(sym: DaySymptoms | undefined): boolean {
  if (!sym) return false;
  return sym.flow === 'light';
}

function suppressNoPeriodForMode(mode: PhysioMode): boolean {
  return mode === 'postpartum' || mode === 'breastfeeding';
}

export function computeClinicalInsights(args: {
  today?: Date;
  periodHistory: string[];
  periodStart?: string | null;
  periodLength: number;

  symptomsByDay?: Record<string, DaySymptoms>;
  physioMode?: PhysioMode;
}): ClinicalFlag[] {
  const today = normalizeNoon(args.today ?? new Date());
  const mode: PhysioMode = args.physioMode ?? 'none';
  const symptomsByDay = args.symptomsByDay ?? {};

  const starts = [
    ...(Array.isArray(args.periodHistory) ? args.periodHistory : []),
    ...(args.periodStart ? [args.periodStart] : []),
  ];

  const flags: ClinicalFlag[] = [];

  // thresholds (MVP)
  const SHORT_CYCLE_LT = 21; // days
  const LONG_CYCLE_GT = 35; // days
  const PROLONGED_BLEEDING_GT = 8; // days, בפועל
  const NO_PERIOD_GT_DEFAULT = 45; // days since last start (מצב רגיל)

  // 1) cycle length abnormality (לפי תאריכי תחילת וסת)
  const diffsAll = computeCycleDiffs(starts);
  const diffs = diffsAll.slice(-5);

  if (diffs.length >= 2) {
    const medAll = median(diffsAll);
    const shortCount = countWhere(diffs, d => d < SHORT_CYCLE_LT);
    const longCount = countWhere(diffs, d => d > LONG_CYCLE_GT);

    const need = 2;

    if (shortCount >= need) {
      flags.push({
        type: 'short_cycles',
        severity: 'suggest',
        title: 'מחזורים קצרים מהרגיל',
        message: 'נראה שיש כמה מחזורים קצרים מאוד לאחרונה. אם זה דפוס שחוזר, שווה לשקול ייעוץ רפואי או מעקב נוסף.',
      });
    }

    if (longCount >= need) {
      flags.push({
        type: 'long_cycles',
        severity: 'suggest',
        title: 'מחזורים ארוכים מהרגיל',
        message: 'נראה שיש כמה מחזורים ארוכים מאוד לאחרונה. אם זה דפוס שחוזר, שווה לשקול ייעוץ רפואי או מעקב נוסף.',
      });
    }

    if (medAll !== null && (medAll < 22 || medAll > 34) && diffsAll.length >= 3) {
      flags.push({
        type: medAll < 22 ? 'short_cycles' : 'long_cycles',
        severity: 'info',
        title: 'אורך מחזור לא טיפוסי',
        message: 'אורך המחזור הממוצע אצלך נראה לא טיפוסי. זה לא אומר שיש בעיה, אבל אם יש תסמינים נוספים או שינוי חדש, כדאי מעקב.',
      });
    }
  }

  // 2) bleeding length based on actual daily flow
  const lastStart = latestDate(starts);
  if (lastStart) {
    const lastStartKey = dateToKey(lastStart);

    // אורך דימום בפועל: רצף ימים החל מתאריך תחילת הווסת האחרון, כל עוד flow != none
    let actualBleedDays = 0;
    for (let i = 0; i < 30; i++) {
      const k = addDaysKey(lastStartKey, i);
      if (!k) break;
      const sym = symptomsByDay[k];
      if (!isBleedingDay(sym)) break;
      actualBleedDays += 1;
    }

    // אם אין סימון flow בכלל לימים האלה - לא ממציאים דימום
    // אם יש, משווים ל periodLength
    if (actualBleedDays > 0) {
      const configured = Number.isFinite(args.periodLength) ? args.periodLength : 0;

      if (configured > 0 && actualBleedDays > configured + 1) {
        flags.push({
          type: 'bleeding_longer_than_config',
          severity: 'info',
          title: 'הדימום נמשך יותר מהרגיל אצלך',
          message: `לפי הסימפטומים שסומנו, הדימום נמשך בערך ${actualBleedDays} ימים, בעוד שבהגדרות הוגדר ${configured}. אם זה חוזר או אם הדימום חריג, שווה מעקב רפואי.`,
        });
      }

      if (actualBleedDays > PROLONGED_BLEEDING_GT) {
        flags.push({
          type: 'prolonged_bleeding',
          severity: 'suggest',
          title: 'דימום ממושך',
          message: `לפי הסימפטומים שסומנו, הדימום נמשך בערך ${actualBleedDays} ימים. אם זה לא דפוס קבוע אצלך או אם יש החמרה, כדאי לשקול ייעוץ רפואי.`,
        });
      }
    }

    // 3) intermenstrual bleeding: flow מחוץ לחלון הווסת האחרון
    // נגדיר "חלון וסת" לפי periodLength (מינימום 2, מקסימום 12)
    const pl = Math.min(12, Math.max(2, Number.isFinite(args.periodLength) ? args.periodLength : 5));
    const windowEndKey = addDaysKey(lastStartKey, pl - 1);

    // נבדוק 45 ימים אחורה, ונזהה ימים עם flow != none שלא בתוך החלון
    const lookbackDays = 45;
    let interCount = 0;
    let interHeavyCount = 0;

    for (let i = 0; i < lookbackDays; i++) {
      const k = dateToKey(new Date(today.getTime() - i * MS_PER_DAY));
      const sym = symptomsByDay[k];
      if (!isBleedingDay(sym)) continue;

      // בתוך חלון הווסת האחרון? לא נספר
      if (windowEndKey) {
        const kd = keyToDate(k);
        const sd = keyToDate(lastStartKey);
        const ed = keyToDate(windowEndKey);
        if (kd && sd && ed) {
          if (kd.getTime() >= sd.getTime() && kd.getTime() <= ed.getTime()) continue;
        }
      }

      interCount += 1;
      if (sym?.flow === 'medium' || sym?.flow === 'heavy') interHeavyCount += 1;
    }

    // תנאי מינימלי כדי לא להציף: לפחות 2 ימים מחוץ לחלון
    if (interCount >= 2) {
      const sev: ClinicalFlag['severity'] = interHeavyCount >= 1 ? 'suggest' : 'info';
      const title = 'דימום או הכתמות בין מחזורים';
      const message =
        interHeavyCount >= 1
          ? 'סומנו מספר ימים עם דימום בעוצמה בינונית או כבדה מחוץ לחלון הווסת האחרון. אם זה חוזר או אם יש כאב, סחרחורת או דימום משמעותי, שווה לשקול ייעוץ רפואי.'
          : 'סומנו מספר ימים עם הכתמות או דימום קל מחוץ לחלון הווסת האחרון. אם זה חוזר, כדאי לשקול מעקב רפואי לפי הצורך.';

      flags.push({
        type: 'intermenstrual_bleeding',
        severity: sev,
        title,
        message,
      });
    }

    // 4) no period (time since last start) - מדוכא בהנקה ואחרי לידה
    if (!suppressNoPeriodForMode(mode)) {
      const since = daysBetween(lastStart, today);

      // סף עדין יותר למצבים לא regular
      const NO_PERIOD_GT =
        mode === 'perimenopause' || mode === 'stoppingPills' ? Math.max(60, NO_PERIOD_GT_DEFAULT) : NO_PERIOD_GT_DEFAULT;

      if (since > NO_PERIOD_GT) {
        flags.push({
          type: 'no_period',
          severity: 'suggest',
          title: 'איחור משמעותי במחזור',
          message: 'נראה שעבר זמן ממושך מאז תחילת המחזור האחרונה. אם זה לא צפוי עבורך, שווה לשקול בדיקה או ייעוץ רפואי.',
        });
      }
    }
  }

  return flags;
}
