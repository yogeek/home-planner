import type { Purchase } from './types';

/** Articles achetés au moins 3 fois dont l'intervalle médian d'achat est écoulé */
export function suggest(history: Purchase[], nowISO: string): string[] {
  const byLabel = new Map<string, string[]>();
  for (const p of history) {
    const day = p.purchasedAt.slice(0, 10);
    const days = byLabel.get(p.label) ?? [];
    if (!days.includes(day)) days.push(day);
    byLabel.set(p.label, days);
  }

  const now = new Date(nowISO).getTime();
  const due: { label: string; overdue: number }[] = [];

  for (const [label, days] of byLabel) {
    if (days.length < 3) continue;
    days.sort();
    const intervals: number[] = [];
    for (let i = 1; i < days.length; i++) {
      intervals.push(
        (new Date(days[i] + 'T00:00:00Z').getTime() - new Date(days[i - 1] + 'T00:00:00Z').getTime()) / 86400000,
      );
    }
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const last = new Date(days[days.length - 1] + 'T00:00:00Z').getTime();
    const elapsed = (now - last) / 86400000;
    if (elapsed >= median) due.push({ label, overdue: elapsed - median });
  }

  return due.sort((a, b) => b.overdue - a.overdue).map((d) => d.label);
}

/** Les articles les plus fréquents (au moins 2 jours d'achat distincts), max 12 */
export function frequentItems(history: Purchase[]): string[] {
  const counts = new Map<string, Set<string>>();
  for (const p of history) {
    const set = counts.get(p.label) ?? new Set<string>();
    set.add(p.purchasedAt.slice(0, 10));
    counts.set(p.label, set);
  }
  return [...counts.entries()]
    .filter(([, days]) => days.size >= 2)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([label]) => label);
}
