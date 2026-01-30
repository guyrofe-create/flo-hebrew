// lib/cycleInsights.ts
import { normalizeNoon } from './date';

export type CycleLengthPoint = {
  index: number; // 1..N
  startIso: string; // מחזור "נוכחי" שממנו מחשבים עד הבא
  nextStartIso: string; // תחילת המחזור הבא
  lengthDays: number; // אורך המחזור בימים
};

export type PhysioMode = 'regular' | 'postpartum' | 'breastfeeding' | 'perimenopause' | 'stoppingPills';

export type PredictionConfidence = 'none' | 'very_low' | 'low' | 'medium' | 'high';

export type CycleInsights = {
  points: CycleLengthPoint[];

  n: number;
  avg: number | null;
  stdDev: number | null;
  std?: number | null;

  min: number | null;
  max: number | null;

  hasOutOfRange: boolean; // מחזור <24 או >38 (לגיל 18-45)
  isIrregular: boolean; // variation > threshold (כשיש מספיק נתונים) או out-of-range
  irregularReason: string[];

  irregularThresholdDays: number | null; // 7 או 9 (אם גיל ידוע), אחרת null
  variationDays: number | null; // max-min

  physioMode: PhysioMode;
  predictionConfidence: PredictionConfidence;

  modeNote: string | null;
  suppressIrregularFlag: boolean;
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

  if (ageYears >= 18 && ageYears <= 25) return 7;
  if (ageYears >= 26 && ageYears <= 41) return 9;
  if (ageYears >= 42 && ageYears <= 45) return 7;

  return null;
}

function modeMeta(mode: PhysioMode): {
  predictionConfidence: PredictionConfidence;
  modeNote: string | null;
  suppressIrregularFlag: boolean;
} {
  switch (mode) {
    case 'postpartum':
      return {
        predictionConfidence: 'very_low',
        modeNote: 'אחרי לידה המחזורים והביוץ יכולים להיות לא צפויים, ולכן התחזיות פחות מדויקות בתקופה זו.',
        suppressIrregularFlag: true,
      };
    case 'breastfeeding':
      return {
        predictionConfidence: 'very_low',
        modeNote: 'בהנקה ביוץ יכול להיות לא סדיר או להופיע בלי דפוס קבוע, ולכן התחזיות פחות מדויקות.',
        suppressIrregularFlag: true,
      };
    case 'stoppingPills':
      return {
        predictionConfidence: 'low',
        modeNote: 'לאחר הפסקת גלולות הגוף עשוי להסתגל בהדרגה. המחזורים הראשונים יכולים להיות לא יציבים ולכן התחזיות פחות מדויקות.',
        suppressIrregularFlag: true,
      };
    case 'perimenopause':
      return {
        predictionConfidence: 'low',
        modeNote: 'לקראת גיל המעבר שכיחים שינויים באורך המחזור ובביוץ, ולכן התחזיות פחות מדויקות בתקופה זו.',
        suppressIrregularFlag: true,
      };
    case 'regular':
    default:
      return {
        predictionConfidence: 'medium',
        modeNote: null,
        suppressIrregularFlag: false,
      };
  }
}

export function computeCycleInsights(
  periodHistoryIso: string[] | undefined,
  ageYears?: number,
  physioMode: PhysioMode = 'regular'
): CycleInsights {
  const src = Array.isArray(periodHistoryIso) ? periodHistoryIso.filter(Boolean) : [];
  const dates: string[] = [];

  for (const iso of src) {
    const d = safeDate(iso);
    if (!d) continue;
    dates.push(d.toISOString());
  }

  const sorted = [...new Set(dates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const points: CycleLengthPoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const aIso = sorted[i];
    const bIso = sorted[i + 1];
    const a = safeDate(aIso);
    const b = safeDate(bIso);
    if (!a || !b) continue;

    const len = daysBetween(a, b);
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
    const variance = lengths.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / n;
    return Math.sqrt(variance);
  })();

  const min = n ? Math.min(...lengths) : null;
  const max = n ? Math.max(...lengths) : null;

  const variationDays = min !== null && max !== null ? max - min : null;

  const threshold = figoIrregularityThreshold(ageYears);

  const inFigoAgeRange = typeof ageYears === 'number' && ageYears >= 18 && ageYears <= 45;
  const hasOutOfRange = inFigoAgeRange ? lengths.some(l => l < 24 || l > 38) : false;

  const enoughForVariation = n >= 2 && variationDays !== null;
  const variationIrregular = threshold !== null && enoughForVariation && variationDays > threshold;

  const meta = modeMeta(physioMode);

  const isIrregularRaw = threshold !== null ? hasOutOfRange || variationIrregular : hasOutOfRange;
  const isIrregular = meta.suppressIrregularFlag ? false : isIrregularRaw;

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

  if (threshold !== null && enoughForVariation && variationDays !== null && variationDays > threshold) {
    irregularReason.push(`השונות בין אורכי המחזורים גבוהה: הפער בין הקצר לארוך הוא ${variationDays} ימים (סף FIGO: יותר מ-${threshold}).`);
  }

  if (meta.suppressIrregularFlag) {
    irregularReason.length = 0;
    if (meta.modeNote) irregularReason.push(meta.modeNote);
  }

  let predictionConfidence: PredictionConfidence = meta.predictionConfidence;
  if (physioMode === 'regular') {
    if (n >= 6) predictionConfidence = 'high';
    else if (n >= 3) predictionConfidence = 'medium';
    else if (n >= 1) predictionConfidence = 'low';
    else predictionConfidence = 'none';
  } else {
    if (n === 0) predictionConfidence = 'none';
  }

  return {
    points,
    n,
    avg,
    stdDev,
    std: stdDev,
    min,
    max,
    hasOutOfRange,
    isIrregular,
    irregularReason,
    irregularThresholdDays: threshold,
    variationDays,

    physioMode,
    predictionConfidence,
    modeNote: meta.modeNote,
    suppressIrregularFlag: meta.suppressIrregularFlag,
  };
}
