import { addDays, dateFromKey, formatKey } from './date';

export type CyclePrediction = {
  predictedPeriodStart: string;   // YYYY-MM-DD
  fertileWindowStart: string;     // YYYY-MM-DD
  fertileWindowEnd: string;       // YYYY-MM-DD
  ovulationDay: string;           // YYYY-MM-DD
};

export function predictCycle(
  lastPeriodStartIso: string,
  cycleLength: number,
  periodLength: number
): CyclePrediction {
  const lastStart = new Date(lastPeriodStartIso);

  // יום תחילת הווסת הבא
  const nextStart = addDays(lastStart, cycleLength);

  // ביוץ ≈ 14 יום לפני וסת
  const ovulation = addDays(nextStart, -14);

  // חלון פוריות: 5 ימים לפני ביוץ + יום ביוץ
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = ovulation;

  return {
    predictedPeriodStart: formatKey(nextStart),
    fertileWindowStart: formatKey(fertileStart),
    fertileWindowEnd: formatKey(fertileEnd),
    ovulationDay: formatKey(ovulation),
  };
}

export function isDateInRange(dayKey: string, startKey: string, endKey: string) {
  const d = dateFromKey(dayKey).getTime();
  const s = dateFromKey(startKey).getTime();
  const e = dateFromKey(endKey).getTime();
  return d >= s && d <= e;
}
