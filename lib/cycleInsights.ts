// lib/cycleInsights.ts
import { normalizeNoon } from './date';

export type CycleLengthPoint = {
  index: number;            // 1..N
  startIso: string;         // מחזור "נוכחי" שממנו מחשבים עד הבא
  nextStartIso: string;     // תחילת המחזור הבא
  lengthDays: number;       // אורך המחזור בימים
};

export type CycleInsights = {
  points: CycleLengthPoint[];

  n: number;                // מספר אורכי מחזור שיש לנו (N)
  avg: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;

  // FIGO System 1 (18-45): frequent <24, infrequent >38, irregular variation >7 or >9 (age-dependent)
  hasOutOfRange: boolean;     // מחזור <24 או >38 (לגיל 18-45)
  isIrregular: boolean;       // variation > threshold (כשיש מספיק נתונים) או out-of-range
  irregularReason: string[];  // להסבר למשתמשת

  irregularThresholdDays: number | null; // 7 או 9 (אם גיל ידוע), אחרת null
  variationDays: number | null;          // max-min
};

function daysBetween(a: Date, b: Date) {
  const ms = normalizeNoon(b).getTime() - normalizeNoon(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function safeDate(iso: string) {
  const d = normalizeNoon(new Date(iso));
  return Number.isNaN(d.getTime()) ? null : d;
}

function figoIrregularityThreshold(ageYears?: number): number | null {
  if (typeof ageYears !== 'number' || !Number.isFinite(ageYears)) return null;

  // FIGO definitions are based on 18–45; within that:
  // irregular if cycle lengths vary by >7 days (18–25 and 42–45) OR >9 days (26–41)
  if (ageYears >= 18 && ageYears <= 25) return 7;
  if (ageYears >= 26 && ageYears <= 41) return 9;
  if (ageYears >= 42 && ageYears <= 45) return 7;

  // מחוץ לטווח 18–45: FIGO System 1 פחות מבוסס נתונים; נחזיר null כדי שלא “נפסוק” רשמית.
  return null;
}

// ageYears אופציונלי כדי להתאים לספי FIGO של 7/9 ימים
export function computeCycleInsights(periodHistoryIso: string[] | undefined, ageYears?: number): CycleInsights {
  const src = Array.isArray(periodHistoryIso) ? periodHistoryIso.filter(Boolean) : [];
  const dates: string[] = [];

  for (const iso of src) {
    const d = safeDate(iso);
    if (!d) continue;
    dates.push(d.toISOString());
  }

  // מיון עולה (ישן -> חדש) כדי לחשב אורכי מחזור בין תחילות עוקבות
  const sorted = [...new Set(dates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const points: CycleLengthPoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const aIso = sorted[i];
    const bIso = sorted[i + 1];
    const a = safeDate(aIso);
    const b = safeDate(bIso);
    if (!a || !b) continue;

    const len = daysBetween(a, b);
    // סינון בסיסי נגד קפיצות הזויות (עדיין משאיר מרחב)
    if (!Number.isFinite(len) || len < 10 || len > 90) continue;

    points.push({
      index: points.length + 1,
      startIso: aIso,
      nextStartIso: bIso,
      lengthDays: len,
    });
  }

  const lengths = points.map(p => p.lengthDays);
  const n = lengths.length;

  const avg = n ? lengths.reduce((s, x) => s + x, 0) / n : null;

  const stdDev = (() => {
    if (!n || avg === null) return null;
    const variance = lengths.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / n; // population SD
    return Math.sqrt(variance);
  })();

  const min = n ? Math.min(...lengths) : null;
  const max = n ? Math.max(...lengths) : null;

  const variationDays = (min !== null && max !== null) ? (max - min) : null;

  const threshold = figoIrregularityThreshold(ageYears);

  // Out-of-range לפי FIGO System 1 מיועד לגיל 18–45
  const inFigoAgeRange = typeof ageYears === 'number' && ageYears >= 18 && ageYears <= 45;
  const hasOutOfRange = inFigoAgeRange ? lengths.some(l => l < 24 || l > 38) : false;

  // “אי סדירות” לפי FIGO: variation > threshold (צריך לפחות 2 אורכי מחזור כדי להשוות)
  const enoughForVariation = n >= 2 && variationDays !== null;
  const variationIrregular =
    threshold !== null && enoughForVariation && variationDays > threshold;

  // אם אין גיל/מחוץ לטווח: לא נפסוק “אי סדירות” רשמית, רק נציג נתונים (אלא אם יש out-of-range בתוך הטווח)
  const isIrregular =
    (threshold !== null ? (hasOutOfRange || variationIrregular) : hasOutOfRange);

  const irregularReason: string[] = [];

  if (n < 2) {
    irregularReason.push('כדי להעריך סדירות צריך לפחות 3 תאריכי תחילת מחזור (כדי לקבל 2 אורכי מחזור להשוואה).');
  }

  if (!inFigoAgeRange) {
    irregularReason.push('הגדרת סדירות לפי FIGO מבוססת בעיקר על גילאי 18 עד 45. מחוץ לטווח זה מוצגים נתונים ללא קביעה חד משמעית.');
  }

  if (hasOutOfRange) {
    irregularReason.push('נמצא לפחות מחזור אחד קצר מ-24 ימים או ארוך מ-38 ימים (הגדרת FIGO לגיל 18 עד 45).');
  }

  if (threshold !== null && enoughForVariation) {
    if (variationDays !== null && variationDays > threshold) {
      irregularReason.push(`השונות בין אורכי המחזורים גבוהה: הפער בין הקצר לארוך הוא ${variationDays} ימים (סף FIGO: יותר מ-${threshold}).`);
    }
  }

  return {
    points,
    n,
    avg,
    stdDev,
    min,
    max,
    hasOutOfRange,
    isIrregular,
    irregularReason,
    irregularThresholdDays: threshold,
    variationDays,
  };
}
