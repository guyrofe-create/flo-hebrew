// lib/reportExport.ts
import type { DaySymptoms } from '../context/UserDataContext';
import { daysBetween, formatKey, isoNoonFromKey, normalizeNoon } from './date';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function fmtIL(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL');
}

// dayKey הוא YYYY-MM-DD. כדי להציג בלי סטיות זמן, נבנה ISO בצהריים.
function fmtDayKeyIL(dayKey: string) {
  return new Date(isoNoonFromKey(dayKey)).toLocaleDateString('he-IL');
}

function uniqueSortedNewestToOldest(items: string[]) {
  const uniq = Array.from(new Set(items.filter(Boolean)));
  return uniq.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

export function computeCycleLengths(periodHistory: string[]) {
  const sortedOldest = [...periodHistory].sort();
  const diffs: number[] = [];
  for (let i = 1; i < sortedOldest.length; i++) {
    const prev = normalizeNoon(new Date(sortedOldest[i - 1]));
    const curr = normalizeNoon(new Date(sortedOldest[i]));
    const d = daysBetween(prev, curr);
    if (d > 0) diffs.push(d);
  }
  const avg = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
  const min = diffs.length ? Math.min(...diffs) : null;
  const max = diffs.length ? Math.max(...diffs) : null;
  return { diffs, avg, min, max };
}

export function computePeriodLengthsFromSymptoms(periodHistory: string[], symptomsByDay: Record<string, DaySymptoms>) {
  // הערכה פשוטה: לכל תאריך התחלת מחזור, סופרים רצף ימים עם flow != none החל מהיום הזה
  const starts = [...periodHistory].sort(); // oldest to newest
  if (!starts.length) return { values: [], avg: null };

  const values: number[] = [];

  for (const startIso of starts) {
    const start = normalizeNoon(new Date(startIso));
    let len = 0;

    for (let i = 0; i < 15; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);

      // dayKey עקבי כמו בכל האפליקציה
      const dayKey = formatKey(d);

      const sym = symptomsByDay?.[dayKey];
      const flow = sym?.flow;

      if (!flow || flow === 'none') {
        if (i === 0) {
          // אין נתונים ביום הראשון, נוותר על המחזור הזה
          len = 0;
        }
        break;
      }

      len += 1;
    }

    if (len > 0) values.push(clamp(len, 1, 12));
  }

  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return { values, avg };
}

export function collectPositiveOpkDates(symptomsByDay: Record<string, DaySymptoms>) {
  const keys = Object.keys(symptomsByDay || {});
  const positives = keys
    .filter(k => symptomsByDay[k]?.ovulationTest === 'positive')
    // מיון תקין לפי YYYY-MM-DD בלי Date parsing
    .sort((a, b) => b.localeCompare(a));

  return positives;
}

export function collectFlaggedAbnormalSymptoms(symptomsByDay: Record<string, DaySymptoms>) {
  const out: { dayKey: string; text: string }[] = [];

  for (const dayKey of Object.keys(symptomsByDay || {}).sort((a, b) => b.localeCompare(a))) {
    const s = symptomsByDay[dayKey];
    if (!s) continue;

    const flags: string[] = [];
    if (s.pain === 'severe') flags.push('כאב חזק');
    if (typeof s.bbt === 'number' && (s.bbt < 35.0 || s.bbt > 38.0)) flags.push(`BBT חריג: ${s.bbt.toFixed(1)}`);
    if (s.notes && s.notes.trim().length >= 120) flags.push('הערות ארוכות');

    if (flags.length) {
      out.push({ dayKey, text: flags.join(', ') });
    }
  }

  return out;
}

export function buildReportModel(params: { periodHistory: string[]; symptomsByDay: Record<string, DaySymptoms> }) {
  const periodHistoryUniq = uniqueSortedNewestToOldest(params.periodHistory || []);
  const cycles = computeCycleLengths(periodHistoryUniq);
  const periodLens = computePeriodLengthsFromSymptoms(periodHistoryUniq, params.symptomsByDay || {});
  const opk = collectPositiveOpkDates(params.symptomsByDay || {});
  const abnormal = collectFlaggedAbnormalSymptoms(params.symptomsByDay || {});

  return {
    periodHistoryUniq,
    cycles,
    periodLens,
    opk,
    abnormal,
    fmtIL,
    fmtDayKeyIL,
    round1,
  };
}
