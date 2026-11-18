import type { Env } from './index';
import { expandWeek, distributeWeek } from '../shared/schedule';
import { isAvailable } from '../shared/harvest';
import { addDays, seasonOf } from '../shared/dates';
import { getMembers, getTaskDefs, getOccurrencesBetween, getSettings } from './db';

/** La famille est-elle en pause (mode vacances) ce jour-là ? */
export function inPause(date: string, pauseFrom: string | null, pauseUntil: string | null): boolean {
  return !!pauseUntil && date <= pauseUntil && (!pauseFrom || date >= pauseFrom);
}

/**
 * Génère (ou régénère) les occurrences d'une semaine à partir des définitions.
 * Les occurrences déjà faites, sans définition (ponctuelles) ou déplacées manuellement sont conservées,
 * et leur charge compte dans l'équilibre.
 * `fromDate` : rien n'est touché avant cette date (ni créé, ni supprimé) : les missions en retard restent.
 * Les absences, jours chargés et le mode vacances sont respectés.
 */
export async function generateWeek(env: Env, weekStart: string, fromDate?: string): Promise<void> {
  const db = env.DB;
  const members = await getMembers(db);
  const adults = members.filter((m) => m.role === 'adult');
  const teens = members.filter((m) => m.role === 'teen');
  const children = members.filter((m) => m.role === 'child');
  if (adults.length < 1) return;

  const [defs, settings] = await Promise.all([getTaskDefs(db, true), getSettings(db)]);
  const weekEnd = addDays(weekStart, 6);
  const from = fromDate && fromDate > weekStart ? fromDate : weekStart;

  // Rotation : qui a fait chaque définition la dernière fois (2 semaines d'historique)
  const history = await getOccurrencesBetween(db, addDays(weekStart, -14), addDays(weekStart, -1));
  const lastAssignee: Record<string, string> = {};
  for (const o of history) {
    if (o.defId && o.status === 'done' && o.assignee) lastAssignee[o.defId] = o.assignee;
  }

  const existing = await getOccurrencesBetween(db, weekStart, weekEnd);
  // Conservé : tout ce qui précède `from`, et à partir de `from` ce qui est fait, ponctuel ou déplacé à la main
  const keep = existing.filter((o) => o.date < from || o.status !== 'todo' || !o.defId || o.manual);
  const keptDefDates = new Set(keep.filter((o) => o.defId).map((o) => `${o.defId}|${o.date}`));
  const initialLoad: Record<string, number> = {};
  for (const o of keep) {
    if (o.assignee && o.status !== 'skipped') initialLoad[o.assignee] = (initialLoad[o.assignee] ?? 0) + o.weight;
  }

  const slots = expandWeek(defs, weekStart, seasonOf(weekStart)).filter(
    (s) =>
      !keptDefDates.has(`${s.defId}|${s.date}`) &&
      s.date >= from &&
      !inPause(s.date, settings.pauseFrom, settings.pauseUntil),
  );
  const byId = new Map(members.map((m) => [m.id, m]));
  const occurrences = distributeWeek(
    slots,
    adults.map((a) => a.id),
    children.map((c) => c.id),
    lastAssignee,
    {
      teens: teens.map((t) => t.id),
      initialLoad,
      isAvailable: (id, date) => {
        const m = byId.get(id);
        return m ? isAvailable(m, date) : false;
      },
    },
  );

  const stmts: D1PreparedStatement[] = [
    db
      .prepare("DELETE FROM occurrences WHERE date >= ? AND date <= ? AND status = 'todo' AND def_id IS NOT NULL AND manual = 0")
      .bind(from, weekEnd),
  ];
  for (const o of occurrences) {
    stmts.push(
      db
        .prepare(
          'INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status, moment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(crypto.randomUUID(), o.defId, o.title, o.zone, o.weight, o.date, o.assignee, 'todo', o.moment ?? null),
    );
  }
  await db.batch(stmts);
}
