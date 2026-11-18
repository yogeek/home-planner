import type { Env } from './index';
import { addDays, localDate, weekStart } from '../shared/dates';
import { isAvailable } from '../shared/harvest';
import { getMembers, getOccurrencesBetween, getSettings, getTaskDefs } from './db';
import { generateWeek, inPause } from './week';
import { pushToMember } from './push';

/** Un seul déclencheur toutes les 15 minutes ; les rendez-vous sont repérés à l'heure UTC */
export const TICK = '*/15 * * * *';
const MORNING_UTC = '03:00'; // 7h à La Réunion
const EVENING_UTC = '14:30'; // 18h30
const WEEKLY_UTC = '14:00'; // dimanche 18h

/** HH:MM locale (UTC+4) d'un instant */
function localHM(ms: number): string {
  return new Date(ms + 4 * 3600 * 1000).toISOString().slice(11, 16);
}

export async function runCron(scheduledTime: number, env: Env): Promise<void> {
  // Arrondi au quart d'heure (le déclencheur peut partir avec quelques secondes de retard)
  const tick = Math.floor(scheduledTime / (15 * 60 * 1000)) * 15 * 60 * 1000;
  const nowIso = new Date(tick).toISOString();
  const utcHM = nowIso.slice(11, 16);
  const today = localDate(nowIso);
  const isSunday = new Date(tick).getUTCDay() === 0;

  if (isSunday && utcHM === WEEKLY_UTC) {
    // Prépare la semaine qui commence demain (lundi) : chacun peut la voir et l'ajuster dès ce soir
    await generateWeek(env, addDays(weekStart(today), 7));
    const id = env.VILLAGE_HUB.idFromName('main');
    await env.VILLAGE_HUB.get(id).fetch('https://hub/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'refresh' }),
    });
  }

  const settings = await getSettings(env.DB);
  if (inPause(today, settings.pauseFrom, settings.pauseUntil)) return; // vacances : silence radio

  const members = await getMembers(env.DB);
  const adults = members.filter((m) => m.role !== 'child' && isAvailable(m, today));
  const children = members.filter((m) => m.role === 'child');
  const todays = await getOccurrencesBetween(env.DB, today, today);

  // Rappels à heure précise (tâches récurrentes avec une heure de rappel), sur le quart d'heure écoulé
  const defs = await getTaskDefs(env.DB, true);
  const timed = new Map(defs.filter((d) => d.reminderTime).map((d) => [d.id, d.reminderTime as string]));
  const from = localHM(tick - 15 * 60 * 1000);
  const to = localHM(tick);
  for (const o of todays) {
    const at = o.defId ? timed.get(o.defId) : undefined;
    if (!at || o.status !== 'todo' || !o.assignee) continue;
    const inWindow = from < to ? at > from && at <= to : at > from || at <= to;
    if (inWindow) {
      await pushToMember(env, o.assignee, { title: `⏰ C'est l'heure : ${o.title}`, body: 'Le village compte sur toi 🌿', tag: `remind-${o.id}` });
    }
  }

  if (utcHM === MORNING_UTC) {
    for (const adult of adults) {
      if (!adult.notifPrefs.morning) continue;
      const mine = todays.filter((o) => o.assignee === adult.id && o.status === 'todo');
      if (mine.length === 0) continue;
      const lines = mine.map((o) => `• ${o.title}`).join('\n');
      const kids = adult.role === 'adult'
        ? children
            .map((c) => ({ c, n: todays.filter((o) => o.assignee === c.id && o.status === 'todo').length }))
            .filter((k) => k.n > 0)
        : [];
      const extra = kids.length
        ? `\n${kids.map((k) => `${k.n} mission${k.n > 1 ? 's' : ''} pour ${k.c.name}`).join(', ')} 🧸`
        : '';
      await pushToMember(env, adult.id, {
        title: `Bonjour ${adult.name} ! ${mine.length} mission${mine.length > 1 ? 's' : ''} aujourd'hui 🌱`,
        body: lines + extra,
        tag: 'morning',
      });
    }
  }

  if (utcHM === EVENING_UTC) {
    for (const adult of adults) {
      if (!adult.notifPrefs.evening) continue;
      const urgent = todays.filter(
        (o) => o.assignee === adult.id && o.status === 'todo' && (o.weight >= 3 || (o.defId && timed.has(o.defId))),
      );
      if (urgent.length === 0) continue;
      await pushToMember(env, adult.id, {
        title: `Petit rappel du soir 🌙`,
        body: `Il reste : ${urgent.map((o) => o.title).join(', ')}. Le village compte sur toi !`,
        tag: 'evening',
      });
    }
  }
}
