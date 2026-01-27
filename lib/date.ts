export const MS_PER_DAY = 86400000;

export function normalizeNoon(input: Date): Date {
  const d = new Date(input);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function toNoonIso(input: string | Date): string {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  return normalizeNoon(d).toISOString();
}

export function formatKey(date: Date): string {
  const d = normalizeNoon(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return normalizeNoon(dt);
}

export function isoNoonFromKey(key: string): string {
  return dateFromKey(key).toISOString();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return normalizeNoon(d);
}

// days from a to b (b - a)
export function daysBetween(a: Date, b: Date): number {
  const start = normalizeNoon(a).getTime();
  const end = normalizeNoon(b).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}
