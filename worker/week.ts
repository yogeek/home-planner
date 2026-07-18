import type { Env } from './index';
import { expandWeek, distributeWeek } from '../shared/schedule';
import { addDays, seasonOf } from '../shared/dates';
import { getMembers, getTaskDefs, getOccurrencesBetween } from './db';

/**
 * Génère (ou régénère) les occurrences d'une semaine à partir des définitions.
 * Les occurrences déjà faites, sans définition (ponctuelles) ou déplacées manuellement sont conservées.
 */
export async function generateWeek(env: Env, weekStart: string): Promise<void> {
  const db = env.DB;
  const members = await getMembers(db);
  const adults = members.filter((m) => m.role === 'adult');
  const child = members.find((m) => m.role === 'child') ?? null;
  if (adults.length < 2) return;

  const defs = await getTaskDefs(db, true);
  const weekEnd = addDays(weekStart, 6);

  // Rotation : qui a fait chaque définition la dernière fois (2 semaines d'historique)
  const history = await getOccurrencesBetween(db, addDays(weekStart, -14), addDays(weekStart, -1));
  const lastAssignee: Record<string, string> = {};
  for (const o of history) {
    if (o.defId && o.status === 'done') lastAssignee[o.defId] = o.assignee;
  }

  const existing = await getOccurrencesBetween(db, weekStart, weekEnd);
  const keep = existing.filter((o) => o.status !== 'todo' || !o.defId || o.manual);
  const keptDefDates = new Set(keep.filter((o) => o.defId).map((o) => `${o.defId}|${o.date}`));

  const slots = expandWeek(defs, weekStart, seasonOf(weekStart)).filter(
    (s) => !keptDefDates.has(`${s.defId}|${s.date}`),
  );
  const occurrences = distributeWeek(slots, [adults[0].id, adults[1].id], child?.id ?? null, lastAssignee);

  const stmts: D1PreparedStatement[] = [
    db
      .prepare("DELETE FROM occurrences WHERE date >= ? AND date <= ? AND status = 'todo' AND def_id IS NOT NULL AND manual = 0")
      .bind(weekStart, weekEnd),
  ];
  for (const o of occurrences) {
    stmts.push(
      db
        .prepare(
          'INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(crypto.randomUUID(), o.defId, o.title, o.zone, o.weight, o.date, o.assignee, 'todo'),
    );
  }
  await db.batch(stmts);
}
