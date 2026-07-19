import type { MemberProgress, Occurrence } from './types';

/** Paliers du village : coût en glands pour atteindre le palier, et embellissement débloqué */
export const LEVELS: { cost: number; unlock: string; emoji: string }[] = [
  { cost: 75, unlock: 'Le puits fleuri', emoji: '🌼' },
  { cost: 100, unlock: 'Les lampions', emoji: '🏮' },
  { cost: 125, unlock: 'Le banc sous le chêne', emoji: '🌳' },
  { cost: 150, unlock: 'La fontaine', emoji: '⛲' },
  { cost: 175, unlock: 'Le potager partagé', emoji: '🥕' },
  { cost: 200, unlock: 'Le pont de bois', emoji: '🌉' },
  { cost: 225, unlock: 'La ruche', emoji: '🐝' },
  { cost: 250, unlock: 'Le moulin à vent', emoji: '🌬️' },
  { cost: 275, unlock: "L'ours voyageur s'installe", emoji: '🐻' },
  { cost: 300, unlock: 'Le verger', emoji: '🍎' },
  { cost: 325, unlock: 'La cabane dans l\'arbre', emoji: '🛖' },
  { cost: 350, unlock: 'Les lucioles du soir', emoji: '✨' },
  { cost: 375, unlock: 'Le kiosque à musique', emoji: '🎻' },
  { cost: 400, unlock: 'La montgolfière', emoji: '🎈' },
  { cost: 425, unlock: 'Le phare du lac', emoji: '🗼' },
  { cost: 450, unlock: 'Le marché couvert', emoji: '🎪' },
  { cost: 475, unlock: 'Les aurores australes', emoji: '🌌' },
  { cost: 500, unlock: 'La grande fête du village', emoji: '🎆' },
];

export interface LevelInfo {
  level: number;
  unlocked: string[];
  nextCost: number | null;
  /** progression 0-1 dans le niveau courant */
  progress: number;
  /** glands accumulés dans le niveau courant */
  intoLevel: number;
}

export function levelFor(acorns: number): LevelInfo {
  let remaining = acorns;
  let level = 0;
  const unlocked: string[] = [];
  for (const l of LEVELS) {
    if (remaining >= l.cost) {
      remaining -= l.cost;
      level++;
      unlocked.push(l.unlock);
    } else {
      return { level, unlocked, nextCost: l.cost, progress: remaining / l.cost, intoLevel: remaining };
    }
  }
  return { level, unlocked, nextCost: null, progress: 1, intoLevel: remaining };
}

const DECAY_PER_DAY = 12;
const FLOOR = 15;
const NEVER_DONE = 55;

/** Fraîcheur d'une zone, de 15 (délaissée) à 100 (entretenue) */
export function freshness(lastDoneISO: string | null, nowISO: string): number {
  if (!lastDoneISO) return NEVER_DONE;
  const days = Math.max(0, (new Date(nowISO).getTime() - new Date(lastDoneISO).getTime()) / 86400000);
  return Math.max(FLOOR, Math.round(100 - days * DECAY_PER_DAY));
}

/** Glands récoltés cette semaine par chaque membre (tâches faites, pondérées). Tous les membres. */
export function weekContributions(occurrences: Occurrence[], memberIds: string[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of memberIds) totals[id] = 0;
  for (const o of occurrences) {
    if (o.status === 'done' && o.assignee in totals) totals[o.assignee] += o.weight;
  }
  return totals;
}

export function updateStreak(progress: MemberProgress, doneDateLocal: string): MemberProgress {
  if (progress.lastActiveDate === doneDateLocal) return progress;
  const prev = progress.lastActiveDate ? new Date(progress.lastActiveDate + 'T00:00:00Z').getTime() : 0;
  const cur = new Date(doneDateLocal + 'T00:00:00Z').getTime();
  const consecutive = cur - prev === 86400000;
  const streak = consecutive ? progress.streak + 1 : 1;
  return {
    ...progress,
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    lastActiveDate: doneDateLocal,
  };
}
