import type { Member, Occurrence } from './types';
import { dayOfWeek } from './dates';

/** Retard (en noisettes) au-delà duquel on suggère un coup de main */
const LAG_THRESHOLD = 5;

/**
 * Message d'entraide bienveillant de la récolte de la semaine.
 * On ne compare jamais les noisettes brutes (les tâches de chacun tombent à des jours différents) :
 * on ne regarde que le retard réel (missions passées non faites), et seulement à partir de jeudi.
 */
export function harvestMessage(members: Member[], week: Occurrence[], today: string): string {
  const done = week.filter((o) => o.status === 'done');
  const total = done.reduce((s, o) => s + o.weight, 0);
  if (total === 0) return 'La semaine commence : première mission cochée, première noisette ! 🌱';

  const sharers = members.filter((m) => m.role === 'adult' || m.role === 'teen');
  const adults = members.filter((m) => m.role === 'adult');

  if (adults.length <= 1 && sharers.length <= 1) {
    const a = adults[0];
    const g = a ? done.filter((o) => o.assignee === a.id).reduce((s, o) => s + o.weight, 0) : 0;
    const helpers = members.filter((m) => m.id !== a?.id && done.some((o) => o.assignee === m.id));
    const note = helpers.length
      ? `, et ${helpers.map((k) => k.name).join(' et ')} ${helpers.length > 1 ? 'donnent' : 'donne'} un coup de main 🧸`
      : '';
    return `Bravo ${a?.name ?? ''}, ${g} 🌰 cette semaine${note} !`;
  }

  if (dayOfWeek(today) < 3) return "Bel élan collectif, bravo l'équipe ! 💚";

  const lag = sharers
    .map((m) => ({
      m,
      late: week
        .filter((o) => o.assignee === m.id && o.status === 'todo' && o.date < today)
        .reduce((s, o) => s + o.weight, 0),
    }))
    .sort((a, b) => b.late - a.late);
  const worst = lag[0];
  if (worst && worst.late >= LAG_THRESHOLD) {
    return `🤝 ${worst.m.name} a quelques missions en retard : un coup de main ou un échange ferait plaisir`;
  }
  return "Tout le monde est à jour, bravo l'équipe ! 💚";
}

export interface WeekRecap {
  total: number;
  missions: number;
  perMember: Record<string, number>;
}

/** Bilan d'une semaine : noisettes et missions faites, par personne */
export function weekRecap(week: Occurrence[], memberIds: string[]): WeekRecap {
  const perMember: Record<string, number> = {};
  for (const id of memberIds) perMember[id] = 0;
  let total = 0;
  let missions = 0;
  for (const o of week) {
    if (o.status !== 'done') continue;
    total += o.weight;
    missions++;
    if (o.assignee && o.assignee in perMember) perMember[o.assignee] += o.weight;
  }
  return { total, missions, perMember };
}

/** Une personne peut-elle recevoir des tâches ce jour-là ? (absence, jours chargés) */
export function isAvailable(member: Member, date: string): boolean {
  if (member.awayUntil && date <= member.awayUntil) return false;
  if (member.busyDays?.includes(dayOfWeek(date))) return false;
  return true;
}
