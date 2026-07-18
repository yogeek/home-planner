import type { Env } from './index';
import { addDays, localDate, weekStart } from '../shared/dates';
import { getMembers, getOccurrencesBetween, getTaskDefs } from './db';
import { generateWeek } from './week';
import { pushToMember } from './push';

const MORNING = '0 3 * * *'; // 7h à La Réunion
const EVENING = '30 14 * * *'; // 18h30
const WEEKLY = '0 14 * * SUN'; // dimanche 18h

export async function runCron(cron: string, env: Env): Promise<void> {
  const now = new Date().toISOString();
  const today = localDate(now);

  if (cron === WEEKLY) {
    // Génère la semaine qui commence demain (lundi)
    await generateWeek(env, addDays(weekStart(today), 7));
    const id = env.VILLAGE_HUB.idFromName('main');
    await env.VILLAGE_HUB.get(id).fetch('https://hub/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'refresh' }),
    });
    return;
  }

  const members = await getMembers(env.DB);
  const adults = members.filter((m) => m.role === 'adult');
  const child = members.find((m) => m.role === 'child');
  const todays = await getOccurrencesBetween(env.DB, today, today);

  if (cron === MORNING) {
    for (const adult of adults) {
      if (!adult.notifPrefs.morning) continue;
      const mine = todays.filter((o) => o.assignee === adult.id && o.status === 'todo');
      const childTasks = child ? todays.filter((o) => o.assignee === child.id && o.status === 'todo') : [];
      if (mine.length === 0) continue;
      const lines = mine.map((o) => `• ${o.title}`).join('\n');
      const extra = childTasks.length > 0 ? `\nEt ${childTasks.length} mission(s) pour ${child?.name} 🧸` : '';
      await pushToMember(env, adult.id, {
        title: `Bonjour ${adult.name} ! ${mine.length} mission${mine.length > 1 ? 's' : ''} aujourd'hui 🌱`,
        body: lines + extra,
        tag: 'morning',
      });
    }
    return;
  }

  if (cron === EVENING) {
    const defs = await getTaskDefs(env.DB, true);
    const remindedDefs = new Set(defs.filter((d) => d.reminderTime).map((d) => d.id));
    for (const adult of adults) {
      if (!adult.notifPrefs.evening) continue;
      const urgent = todays.filter(
        (o) => o.assignee === adult.id && o.status === 'todo' && (o.weight >= 3 || (o.defId && remindedDefs.has(o.defId))),
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
