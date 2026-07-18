import { TZ_OFFSET_HOURS } from './types';

/** Date locale (YYYY-MM-DD) à La Réunion pour un instant ISO donné */
export function localDate(iso: string): string {
  const d = new Date(iso);
  d.setUTCHours(d.getUTCHours() + TZ_OFFSET_HOURS);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant la date locale donnée (YYYY-MM-DD) */
export function weekStart(dateLocal: string): string {
  const d = new Date(dateLocal + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateLocal: string, days: number): string {
  const d = new Date(dateLocal + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = lundi ... 6 = dimanche */
export function dayOfWeek(dateLocal: string): number {
  return (new Date(dateLocal + 'T00:00:00Z').getUTCDay() + 6) % 7;
}

/** Numéro de semaine ISO 8601 */
export function isoWeek(dateLocal: string): number {
  const d = new Date(dateLocal + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
}

/** Saison à La Réunion (hémisphère sud) : été de novembre à avril */
export function seasonOf(dateLocal: string): 'summer' | 'winter' {
  const month = Number(dateLocal.slice(5, 7));
  return month >= 11 || month <= 4 ? 'summer' : 'winter';
}
