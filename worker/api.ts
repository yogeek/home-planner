import type { Env } from './index';
import { localDate, weekStart, addDays } from '../shared/dates';
import { freshness, levelFor, updateStreak, weekContributions } from '../shared/village';
import { weekRecap } from '../shared/harvest';
import { suggest, frequentItems } from '../shared/shopping';
import { defaultTaskDefs, type HomeOptions } from '../shared/defaults';
import { AISLES, MOMENTS, SCENE_ZONES, type Moment, type Occurrence, type Role } from '../shared/types';
import { guessAisle } from '../shared/aisles';
import {
  getAllProgress,
  getCategories,
  getMembers,
  getOccurrence,
  getOccurrencesBetween,
  getOpenShopping,
  getPurchases,
  getSettings,
  getTaskDefs,
  getVillage,
  rowToOccurrence,
  rowToProgress,
  setSetting,
} from './db';
import { generateWeek, inPause } from './week';
import { pushToMember } from './push';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function broadcast(env: Env, payload: unknown): Promise<void> {
  const id = env.VILLAGE_HUB.idFromName('main');
  await env.VILLAGE_HUB.get(id).fetch('https://hub/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Garde 1 à 4 caractères Unicode complets (évite de couper une paire de substitution / séquence emoji) */
function cleanEmoji(raw: string | undefined, fallback = '⭐'): string {
  const chars = Array.from((raw ?? '').trim());
  return chars.length ? chars.slice(0, 4).join('') : fallback;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asRole(v: unknown, fallback: Role): Role {
  return v === 'adult' || v === 'teen' || v === 'child' ? v : fallback;
}

function asMoment(v: unknown): Moment | null {
  return MOMENTS.includes(v as Moment) ? (v as Moment) : null;
}

function isDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Empreinte du code parent (on ne garde jamais le code en clair) */
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`village-pin:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pinOk(stored: string | null, pin: unknown): Promise<boolean> {
  if (!stored) return true;
  return typeof pin === 'string' && (await hashPin(pin)) === stored;
}

function localMidnightISO(date: string): string {
  return new Date(`${date}T00:00:00+04:00`).toISOString();
}

async function buildState(env: Env): Promise<Record<string, unknown>> {
  const db = env.DB;
  const now = new Date().toISOString();
  const today = localDate(now);
  const ws = weekStart(today);
  const we = addDays(ws, 6);

  const [members, village, weekOccs, shopping, purchases, progress, taskDefs, categories, settings] = await Promise.all([
    getMembers(db),
    getVillage(db),
    getOccurrencesBetween(db, ws, we),
    getOpenShopping(db),
    getPurchases(db),
    getAllProgress(db),
    getTaskDefs(db),
    getCategories(db),
    getSettings(db),
  ]);

  const [monthRes, overdueRes, nextRes, lastRes, lifetimeRes, spentRes, thanksRes, swapsRes, rewardsRes, claimsRes] =
    await db.batch<Record<string, unknown>>([
      db
        .prepare(
          "SELECT assignee, SUM(weight) AS total, COUNT(*) AS n FROM occurrences WHERE status = 'done' AND date >= ? AND assignee IS NOT NULL GROUP BY assignee",
        )
        .bind(addDays(today, -27)),
      // Missions en retard : non faites, des 7 derniers jours
      db
        .prepare("SELECT * FROM occurrences WHERE status = 'todo' AND date < ? AND date >= ? ORDER BY date, weight DESC")
        .bind(today, addDays(today, -7)),
      db.prepare('SELECT * FROM occurrences WHERE date >= ? AND date <= ? ORDER BY date, weight DESC').bind(addDays(ws, 7), addDays(ws, 13)),
      db.prepare('SELECT * FROM occurrences WHERE date >= ? AND date <= ?').bind(addDays(ws, -7), addDays(ws, -1)),
      db.prepare("SELECT assignee, SUM(weight) AS total FROM occurrences WHERE status = 'done' AND assignee IS NOT NULL GROUP BY assignee"),
      db.prepare('SELECT member_id, SUM(cost) AS total FROM reward_claims GROUP BY member_id'),
      db
        .prepare('SELECT t.occurrence_id, t.from_member, t.created_at FROM thanks t JOIN occurrences o ON o.id = t.occurrence_id WHERE o.date >= ?')
        .bind(addDays(ws, -7)),
      db.prepare("SELECT * FROM swaps WHERE status = 'pending' ORDER BY created_at"),
      db.prepare('SELECT * FROM rewards ORDER BY cost'),
      db.prepare('SELECT * FROM reward_claims ORDER BY claimed_at DESC LIMIT 20'),
    ]);

  const monthTotals: Record<string, { total: number; count: number }> = {};
  for (const r of monthRes.results) monthTotals[r.assignee as string] = { total: r.total as number, count: r.n as number };

  const stars: Record<string, { earned: number; spent: number }> = {};
  for (const m of members) stars[m.id] = { earned: 0, spent: 0 };
  for (const r of lifetimeRes.results) if (stars[r.assignee as string]) stars[r.assignee as string].earned = r.total as number;
  for (const r of spentRes.results) if (stars[r.member_id as string]) stars[r.member_id as string].spent = r.total as number;

  // Mode vacances : les zones ne se ternissent pas pendant la pause
  const paused = inPause(today, settings.pauseFrom, settings.pauseUntil);
  const freshNow = paused && settings.pauseFrom ? localMidnightISO(settings.pauseFrom) : now;
  const zoneFreshness: Record<string, number> = {};
  for (const zone of SCENE_ZONES) zoneFreshness[zone] = freshness(village.zoneLastDone[zone] ?? null, freshNow);

  const memberIds = members.map((m) => m.id);
  const lastWeekOccs = lastRes.results.map(rowToOccurrence);

  return {
    now,
    today,
    vapidPublic: env.VAPID_PUBLIC ?? null,
    weekStart: ws,
    onboarded: members.length > 0,
    members,
    village: {
      acorns: village.acorns,
      levelInfo: levelFor(village.acorns),
      freshness: zoneFreshness,
    },
    week: weekOccs,
    overdue: overdueRes.results.map(rowToOccurrence),
    nextWeek: nextRes.results.map(rowToOccurrence),
    lastWeek: { ...weekRecap(lastWeekOccs, memberIds), weekStart: addDays(ws, -7) },
    shopping,
    suggestions: suggest(purchases, now),
    frequent: frequentItems(purchases),
    progress,
    weekGlands: weekContributions(weekOccs, memberIds),
    monthTotals,
    taskDefs,
    categories,
    settings: {
      weeklyGoal: settings.weeklyGoal,
      goalReward: settings.goalReward,
      pauseFrom: settings.pauseFrom,
      pauseUntil: settings.pauseUntil,
      paused,
      hasPin: !!settings.parentPin,
    },
    thanks: thanksRes.results.map((r) => ({
      occurrenceId: r.occurrence_id as string,
      from: r.from_member as string,
      at: r.created_at as string,
    })),
    swaps: swapsRes.results.map((r) => ({
      id: r.id as string,
      fromOcc: r.from_occ as string,
      toOcc: r.to_occ as string,
      fromMember: r.from_member as string,
      toMember: r.to_member as string,
      createdAt: r.created_at as string,
    })),
    rewards: rewardsRes.results.map((r) => ({ id: r.id as string, title: r.title as string, emoji: r.emoji as string, cost: r.cost as number })),
    claims: claimsRes.results.map((r) => ({
      id: r.id as string,
      memberId: r.member_id as string,
      title: r.title as string,
      emoji: r.emoji as string,
      cost: r.cost as number,
      claimedAt: r.claimed_at as string,
    })),
    stars,
  };
}

const CREATURE_COLORS: Record<string, string> = {
  renard: '#D9714E',
  chouette: '#8B6FAE',
  'panda roux': '#C0563B',
  hérisson: '#9C7B52',
  lapin: '#7FA8C9',
  ours: '#6B4F3A',
};

/** Marque une occurrence faite : noisettes, fraîcheur de la zone, série. Une tâche « à prendre » revient à celui qui la fait. */
async function markDone(env: Env, occ: Occurrence, doneBy: string | null, validatedBy: string | null): Promise<void> {
  const db = env.DB;
  const now = new Date().toISOString();
  const assignee = occ.assignee ?? doneBy;
  if (!assignee) return;
  await db
    .prepare("UPDATE occurrences SET status = 'done', done_at = ?, done_by = ?, validated_by = ?, assignee = ? WHERE id = ?")
    .bind(now, doneBy ?? assignee, validatedBy, assignee, occ.id)
    .run();
  const village = await getVillage(db);
  const categories = await getCategories(db);
  const sceneZone = categories.find((c) => c.id === occ.zone)?.zone ?? 'loisirs';
  village.zoneLastDone[sceneZone] = now;
  await db
    .prepare('UPDATE village SET acorns = acorns + ?, zone_last_done = ? WHERE id = 1')
    .bind(occ.weight, JSON.stringify(village.zoneLastDone))
    .run();
  const pr = await db.prepare('SELECT * FROM progress WHERE member_id = ?').bind(assignee).first();
  if (pr) {
    const updated = updateStreak(rowToProgress(pr as Record<string, unknown>), localDate(now));
    await db
      .prepare('UPDATE progress SET streak = ?, best_streak = ?, last_active_date = ? WHERE member_id = ?')
      .bind(updated.streak, updated.bestStreak, updated.lastActiveDate, assignee)
      .run();
  }
}

export async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api'.length);
  const method = request.method;

  if (path === '/health') return json({ ok: true, ts: new Date().toISOString() });

  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('k');
  if (token !== env.FAMILY_TOKEN) return json({ error: 'Accès refusé' }, 401);

  // WebSocket temps réel
  if (path === '/ws') {
    const id = env.VILLAGE_HUB.idFromName('main');
    return env.VILLAGE_HUB.get(id).fetch(request);
  }

  const db = env.DB;
  const notify = () => ctx.waitUntil(broadcast(env, { type: 'refresh' }));
  const push = (memberId: string | null | undefined, title: string, body: string, tag?: string) => {
    if (memberId) ctx.waitUntil(pushToMember(env, memberId, { title, body, tag }));
  };
  const today = () => localDate(new Date().toISOString());
  const nameOf = async (id: string | null | undefined) => (await getMembers(db)).find((m) => m.id === id)?.name ?? "Quelqu'un";

  try {
    if (path === '/state' && method === 'GET') {
      return json(await buildState(env));
    }

    if (path === '/onboard' && method === 'POST') {
      const body = await readBody(request);
      const existing = await getMembers(db);
      if (existing.length > 0) return json({ error: 'Déjà configuré' }, 409);
      const membersIn = body.members as { name: string; creature: string; role: Role }[];
      if (!membersIn?.length) return json({ error: 'Membres manquants' }, 400);
      if (!membersIn.some((m) => m.role === 'adult')) return json({ error: 'Il faut au moins un adulte dans le foyer' }, 400);
      const homeIn = (body.home ?? {}) as Partial<HomeOptions>;
      const home: HomeOptions = { garden: homeIn.garden !== false, pool: homeIn.pool !== false, pet: !!homeIn.pet };

      const now = new Date().toISOString();
      const stmts: D1PreparedStatement[] = [];
      for (const m of membersIn) {
        const id = crypto.randomUUID();
        stmts.push(
          db
            .prepare('INSERT INTO members (id, name, creature, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, m.name, m.creature, asRole(m.role, 'adult'), CREATURE_COLORS[m.creature] ?? '#3E5C40', now),
        );
        stmts.push(db.prepare('INSERT INTO progress (member_id) VALUES (?)').bind(id));
      }
      for (const d of defaultTaskDefs(home)) {
        stmts.push(
          db
            .prepare(
              'INSERT INTO task_defs (id, title, zone, weight, recurrence, child_task, reminder_time, season, moment, pool) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            )
            .bind(
              crypto.randomUUID(),
              d.title,
              d.zone,
              d.weight,
              JSON.stringify(d.recurrence),
              d.childTask ? 1 : 0,
              d.reminderTime ?? null,
              d.season,
              d.moment ?? null,
              d.pool ? 1 : 0,
            ),
        );
      }
      stmts.push(db.prepare("INSERT INTO village (id, acorns, zone_last_done) VALUES (1, 0, '{}')"));
      await db.batch(stmts);
      await generateWeek(env, weekStart(localDate(now)), localDate(now));
      notify();
      return json(await buildState(env));
    }

    // Ajouter un habitant
    if (path === '/members' && method === 'POST') {
      const body = await readBody(request);
      const name = (body.name as string)?.trim();
      const creature = (body.creature as string)?.trim();
      const role = asRole(body.role, 'adult');
      if (!name || !creature) return json({ error: 'Nom et créature requis' }, 400);
      const id = crypto.randomUUID();
      await db.batch([
        db
          .prepare('INSERT INTO members (id, name, creature, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, name, creature, role, CREATURE_COLORS[creature] ?? '#3E5C40', new Date().toISOString()),
        db.prepare('INSERT INTO progress (member_id) VALUES (?)').bind(id),
      ]);
      // Un nouvel habitant peut recevoir des tâches : on régénère la semaine en cours (à partir d'aujourd'hui)
      await generateWeek(env, weekStart(today()), today());
      notify();
      return json(await buildState(env));
    }

    // Éditer ou retirer un habitant
    const memberIdMatch = path.match(/^\/members\/([^/]+)$/);
    if (memberIdMatch && (method === 'PUT' || method === 'DELETE')) {
      const members = await getMembers(db);
      const member = members.find((m) => m.id === memberIdMatch[1]);
      if (!member) return json({ error: 'Habitant introuvable' }, 404);
      const adults = members.filter((m) => m.role === 'adult');

      if (method === 'DELETE') {
        if (member.role === 'adult' && adults.length <= 1) {
          return json({ error: 'Il faut au moins un adulte dans le foyer' }, 400);
        }
        await db.batch([
          db.prepare('DELETE FROM occurrences WHERE assignee = ?').bind(member.id),
          db.prepare('DELETE FROM push_subs WHERE member_id = ?').bind(member.id),
          db.prepare('DELETE FROM progress WHERE member_id = ?').bind(member.id),
          db.prepare('DELETE FROM swaps WHERE from_member = ? OR to_member = ?').bind(member.id, member.id),
          db.prepare('UPDATE task_defs SET fixed_assignee = NULL WHERE fixed_assignee = ?').bind(member.id),
          db.prepare('DELETE FROM members WHERE id = ?').bind(member.id),
        ]);
        await generateWeek(env, weekStart(today()), today());
      } else {
        const body = await readBody(request);
        const name = ((body.name as string) ?? member.name).trim() || member.name;
        const creature = ((body.creature as string) ?? member.creature).trim() || member.creature;
        const role = asRole(body.role, member.role);
        // Empêcher de retirer le dernier adulte via un changement de rôle
        if (member.role === 'adult' && role !== 'adult' && adults.length <= 1) {
          return json({ error: 'Il faut au moins un adulte dans le foyer' }, 400);
        }
        const awayUntil = body.awayUntil === undefined ? (member.awayUntil ?? null) : isDate(body.awayUntil) ? body.awayUntil : null;
        const busyDays = Array.isArray(body.busyDays)
          ? [...new Set((body.busyDays as number[]).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
          : (member.busyDays ?? []);
        await db
          .prepare('UPDATE members SET name = ?, creature = ?, role = ?, color = ?, away_until = ?, busy_days = ? WHERE id = ?')
          .bind(name, creature, role, CREATURE_COLORS[creature] ?? member.color, awayUntil, JSON.stringify(busyDays), member.id)
          .run();
        const availabilityChanged =
          role !== member.role || awayUntil !== (member.awayUntil ?? null) || JSON.stringify(busyDays) !== JSON.stringify(member.busyDays ?? []);
        if (availabilityChanged) {
          // Les tâches non faites d'une personne qui part en absence sont redistribuées
          if (awayUntil) {
            await db
              .prepare("UPDATE occurrences SET manual = 0 WHERE assignee = ? AND status = 'todo' AND def_id IS NOT NULL AND date >= ? AND date <= ?")
              .bind(member.id, today(), awayUntil)
              .run();
          }
          await generateWeek(env, weekStart(today()), today());
        }
      }
      notify();
      return json(await buildState(env));
    }

    // Édition et suppression d'une occurrence
    const occIdMatch = path.match(/^\/occurrences\/([^/]+)$/);
    if (occIdMatch && (method === 'PUT' || method === 'DELETE')) {
      const occ = await getOccurrence(db, occIdMatch[1]);
      if (!occ) return json({ error: 'Occurrence introuvable' }, 404);
      if (method === 'DELETE') {
        // Tâche partagée : on supprime tout le groupe. Sinon juste cette occurrence.
        const group = occ.groupId
          ? (await getOccurrencesBetween(db, occ.date, occ.date)).filter((o) => o.groupId === occ.groupId)
          : [occ];
        const acornsToRemove = group.filter((o) => o.status === 'done').reduce((s, o) => s + o.weight, 0);
        if (acornsToRemove > 0) {
          await db.prepare('UPDATE village SET acorns = MAX(0, acorns - ?) WHERE id = 1').bind(acornsToRemove).run();
        }
        await db.batch([
          ...group.map((o) => db.prepare('DELETE FROM occurrences WHERE id = ?').bind(o.id)),
          ...group.map((o) => db.prepare('DELETE FROM swaps WHERE from_occ = ? OR to_occ = ?').bind(o.id, o.id)),
        ]);
      } else {
        const body = await readBody(request);
        const cats = await getCategories(db);
        const zone = cats.some((c) => c.id === body.zone) ? (body.zone as string) : occ.zone;
        const moment = body.moment === undefined ? (occ.moment ?? null) : asMoment(body.moment);
        await db
          .prepare('UPDATE occurrences SET title = ?, zone = ?, weight = ?, moment = ?, manual = 1 WHERE id = ?')
          .bind(((body.title as string) ?? occ.title).trim() || occ.title, zone, Number(body.weight) || occ.weight, moment, occ.id)
          .run();
      }
      notify();
      return json(await buildState(env));
    }

    // /occurrences/:id/(done|undo|move|skip|take|thanks)
    const occMatch = path.match(/^\/occurrences\/([^/]+)\/(done|undo|move|skip|take|thanks)$/);
    if (occMatch && method === 'POST') {
      const [, id, action] = occMatch;
      const occ = await getOccurrence(db, id);
      if (!occ) return json({ error: 'Occurrence introuvable' }, 404);
      const body = await readBody(request);

      if (action === 'done') {
        if (occ.status === 'done') return json(await buildState(env));
        await markDone(env, occ, (body.byMemberId as string) ?? null, (body.validatedBy as string) ?? null);
      } else if (action === 'undo') {
        if (occ.status !== 'done') return json(await buildState(env));
        await db.batch([
          db
            .prepare("UPDATE occurrences SET status = 'todo', done_at = NULL, done_by = NULL, validated_by = NULL WHERE id = ?")
            .bind(id),
          db.prepare('UPDATE village SET acorns = MAX(0, acorns - ?) WHERE id = 1').bind(occ.weight),
          db.prepare('DELETE FROM thanks WHERE occurrence_id = ?').bind(id),
        ]);
      } else if (action === 'move') {
        const newAssignee = body.assignee === undefined ? occ.assignee : ((body.assignee as string) || null);
        const assigneeChanged = newAssignee !== occ.assignee;
        // « Confiée par » : seulement quand quelqu'un confie sa tâche à un autre
        const handedBy = assigneeChanged ? ((body.handedBy as string) || null) : (occ.handedBy ?? null);
        const date = isDate(body.date) ? body.date : occ.date;
        await db
          .prepare('UPDATE occurrences SET date = ?, assignee = ?, handed_by = ?, manual = 1 WHERE id = ?')
          .bind(date, newAssignee, handedBy, id)
          .run();
        if (assigneeChanged) {
          await db.prepare("DELETE FROM swaps WHERE status = 'pending' AND (from_occ = ? OR to_occ = ?)").bind(id, id).run();
          if (handedBy && newAssignee) {
            push(newAssignee, `${await nameOf(handedBy)} te confie une mission 🤝`, `« ${occ.title} »`, 'handed');
          }
        }
      } else if (action === 'skip') {
        await db.prepare("UPDATE occurrences SET status = 'skipped' WHERE id = ?").bind(id).run();
      } else if (action === 'take') {
        const by = body.byMemberId as string;
        if (!by) return json({ error: 'Qui prend la tâche ?' }, 400);
        if (occ.assignee) return json({ error: 'Cette tâche a déjà été prise' }, 409);
        await db.prepare('UPDATE occurrences SET assignee = ?, manual = 1 WHERE id = ?').bind(by, id).run();
      } else if (action === 'thanks') {
        const from = body.from as string;
        if (!from || occ.status !== 'done' || from === occ.assignee) return json({ error: 'Merci impossible' }, 400);
        const res = await db
          .prepare('INSERT OR IGNORE INTO thanks (occurrence_id, from_member, created_at) VALUES (?, ?, ?)')
          .bind(id, from, new Date().toISOString())
          .run();
        if (res.meta.changes) push(occ.assignee, `💛 ${await nameOf(from)} te dit merci !`, `Pour « ${occ.title} »`, `thanks-${id}`);
      }
      notify();
      return json(await buildState(env));
    }

    if (path === '/occurrences' && method === 'POST') {
      const body = await readBody(request);
      const title = (body.title as string)?.trim();
      if (!title) return json({ error: 'Titre requis' }, 400);
      const cats = await getCategories(db);
      const zone = cats.some((c) => c.id === body.zone) ? (body.zone as string) : 'loisirs';
      const date = isDate(body.date) ? body.date : today();
      const weight = Math.min(5, Math.max(1, Number(body.weight) || 2));
      const moment = asMoment(body.moment);

      // Tâche « à prendre » : sans assigné, le premier qui la prend
      if (body.pool) {
        await db
          .prepare(
            'INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status, manual, moment) VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, 1, ?)',
          )
          .bind(crypto.randomUUID(), title, zone, weight, date, 'todo', moment)
          .run();
        notify();
        return json(await buildState(env));
      }

      // Une ou plusieurs personnes ; en cas de partage, une occurrence par participant liée par group_id
      const requested = Array.isArray(body.assignees) && body.assignees.length
        ? (body.assignees as string[])
        : [(body.assignee as string) ?? (body.byMemberId as string)];
      const memberIds = new Set((await getMembers(db)).map((m) => m.id));
      const assignees = [...new Set(requested.filter((a) => memberIds.has(a)))];
      if (!assignees.length) return json({ error: 'Assigné requis' }, 400);

      const groupId = assignees.length > 1 ? crypto.randomUUID() : null;
      await db.batch(
        assignees.map((a) =>
          db
            .prepare(
              'INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status, manual, group_id, moment) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
            )
            .bind(crypto.randomUUID(), title, zone, weight, date, a, 'todo', groupId, moment),
        ),
      );
      notify();
      return json(await buildState(env));
    }

    // Échanges de tâches : « je fais ta lessive si tu fais mon aspirateur »
    if (path === '/swaps' && method === 'POST') {
      const body = await readBody(request);
      const [mine, theirs] = await Promise.all([getOccurrence(db, body.fromOcc as string), getOccurrence(db, body.toOcc as string)]);
      if (!mine || !theirs || mine.status !== 'todo' || theirs.status !== 'todo' || !mine.assignee || !theirs.assignee) {
        return json({ error: 'Échange impossible' }, 400);
      }
      if (mine.assignee === theirs.assignee) return json({ error: 'Ces deux tâches sont à la même personne' }, 400);
      await db
        .prepare('INSERT INTO swaps (id, from_occ, to_occ, from_member, to_member, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), mine.id, theirs.id, mine.assignee, theirs.assignee, new Date().toISOString())
        .run();
      push(theirs.assignee, `🔁 ${await nameOf(mine.assignee)} propose un échange`, `Sa tâche « ${mine.title} » contre ta tâche « ${theirs.title} »`, 'swap');
      notify();
      return json(await buildState(env));
    }

    const swapMatch = path.match(/^\/swaps\/([^/]+)\/(accept|decline)$/);
    if (swapMatch && method === 'POST') {
      const [, id, action] = swapMatch;
      const swap = await db.prepare("SELECT * FROM swaps WHERE id = ? AND status = 'pending'").bind(id).first();
      if (!swap) return json({ error: 'Échange introuvable' }, 404);
      if (action === 'accept') {
        const [a, b] = await Promise.all([getOccurrence(db, swap.from_occ as string), getOccurrence(db, swap.to_occ as string)]);
        if (!a || !b || a.status !== 'todo' || b.status !== 'todo') {
          await db.prepare("UPDATE swaps SET status = 'declined' WHERE id = ?").bind(id).run();
          notify();
          return json({ error: "Une des tâches n'est plus disponible" }, 409);
        }
        await db.batch([
          db.prepare('UPDATE occurrences SET assignee = ?, handed_by = NULL, manual = 1 WHERE id = ?').bind(b.assignee, a.id),
          db.prepare('UPDATE occurrences SET assignee = ?, handed_by = NULL, manual = 1 WHERE id = ?').bind(a.assignee, b.id),
          db.prepare("UPDATE swaps SET status = 'accepted' WHERE id = ?").bind(id),
          // Les autres échanges en attente sur ces tâches n'ont plus de sens
          db
            .prepare("UPDATE swaps SET status = 'declined' WHERE status = 'pending' AND (from_occ IN (?, ?) OR to_occ IN (?, ?))")
            .bind(a.id, b.id, a.id, b.id),
        ]);
        push(swap.from_member as string, '🔁 Échange accepté !', `${await nameOf(swap.to_member as string)} a dit oui`, 'swap');
      } else {
        await db.prepare("UPDATE swaps SET status = 'declined' WHERE id = ?").bind(id).run();
        push(swap.from_member as string, 'Échange refusé', `${await nameOf(swap.to_member as string)} préfère garder ses tâches`, 'swap');
      }
      notify();
      return json(await buildState(env));
    }

    if (path === '/shopping' && method === 'POST') {
      const body = await readBody(request);
      const label = (body.label as string)?.trim();
      if (!label) return json({ error: 'Libellé requis' }, 400);
      const existing = await db
        .prepare("SELECT id FROM shopping_items WHERE lower(label) = lower(?) AND status IN ('open','checked')")
        .bind(label)
        .first();
      if (existing) {
        // Déjà dans la liste : on augmente la quantité (« Lait ×2 »)
        await db
          .prepare("UPDATE shopping_items SET qty = qty + 1, status = 'open', checked_at = NULL WHERE id = ?")
          .bind(existing.id as string)
          .run();
      } else {
        // Rayon : dernier achat connu, sinon deviné d'après le nom
        const past = await db
          .prepare('SELECT aisle FROM purchase_history WHERE lower(label) = lower(?) ORDER BY purchased_at DESC LIMIT 1')
          .bind(label)
          .first();
        const aisle = (body.aisle as string) ?? (past?.aisle as string) ?? guessAisle(label);
        await db
          .prepare('INSERT INTO shopping_items (id, label, aisle, added_by, added_at) VALUES (?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), label, aisle, (body.byMemberId as string) ?? '', new Date().toISOString())
          .run();
      }
      notify();
      return json(await buildState(env));
    }

    // Changement manuel de rayon ou de quantité
    const shopIdMatch = path.match(/^\/shopping\/([^/]+)$/);
    if (shopIdMatch && method === 'PUT') {
      const body = await readBody(request);
      const item = await db.prepare('SELECT * FROM shopping_items WHERE id = ?').bind(shopIdMatch[1]).first();
      if (!item) return json({ error: 'Article introuvable' }, 404);
      await db
        .prepare('UPDATE shopping_items SET aisle = ?, qty = ? WHERE id = ?')
        .bind(
          AISLES.includes(body.aisle as (typeof AISLES)[number]) ? (body.aisle as string) : (item.aisle as string),
          Math.max(1, Number(body.qty) || (item.qty as number)),
          shopIdMatch[1],
        )
        .run();
      notify();
      return json(await buildState(env));
    }

    const shopMatch = path.match(/^\/shopping\/([^/]+)\/(check|uncheck|remove)$/);
    if (shopMatch && method === 'POST') {
      const [, id, action] = shopMatch;
      if (action === 'check') {
        await db
          .prepare("UPDATE shopping_items SET status = 'checked', checked_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), id)
          .run();
      } else if (action === 'uncheck') {
        await db.prepare("UPDATE shopping_items SET status = 'open', checked_at = NULL WHERE id = ?").bind(id).run();
      } else {
        await db.prepare('DELETE FROM shopping_items WHERE id = ?').bind(id).run();
      }
      notify();
      return json(await buildState(env));
    }

    if (path === '/shopping/checkout' && method === 'POST') {
      const body = await readBody(request);
      const now = new Date().toISOString();
      const checked = await db.prepare("SELECT COUNT(*) AS n FROM shopping_items WHERE status = 'checked'").first();
      await db.batch([
        db
          .prepare(
            "INSERT INTO purchase_history (label, aisle, purchased_at) SELECT label, aisle, ? FROM shopping_items WHERE status = 'checked'",
          )
          .bind(now),
        db.prepare("DELETE FROM shopping_items WHERE status = 'checked'"),
      ]);
      // Faire les courses est une vraie corvée : on coche la tâche « courses » de la semaine, ou on en crée une
      const by = body.byMemberId as string | undefined;
      if (by && ((checked?.n as number) ?? 0) > 0) {
        const t = today();
        const ws = weekStart(t);
        const candidate = (await getOccurrencesBetween(db, ws, addDays(ws, 6)))
          .filter((o) => o.zone === 'courses' && o.status === 'todo' && (o.assignee === by || o.assignee === null || o.date <= t))
          .sort((a, b) => Number(b.assignee === by) - Number(a.assignee === by) || a.date.localeCompare(b.date))[0];
        if (candidate) {
          if (candidate.assignee !== by) {
            await db.prepare('UPDATE occurrences SET assignee = ?, date = ?, manual = 1 WHERE id = ?').bind(by, t, candidate.id).run();
          }
          await markDone(env, { ...candidate, assignee: by }, by, null);
        } else {
          const occId = crypto.randomUUID();
          await db
            .prepare(
              "INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status, manual) VALUES (?, NULL, 'Faire les courses', 'courses', 3, ?, ?, 'todo', 1)",
            )
            .bind(occId, t, by)
            .run();
          const occ = await getOccurrence(db, occId);
          if (occ) await markDone(env, occ, by, null);
        }
      }
      notify();
      return json(await buildState(env));
    }

    if (path === '/week/regenerate' && method === 'POST') {
      const body = await readBody(request);
      const ws = isDate(body.weekStart) ? body.weekStart : weekStart(today());
      await generateWeek(env, ws, today());
      notify();
      return json(await buildState(env));
    }

    if (path === '/tasks' && method === 'POST') {
      const body = await readBody(request);
      const title = (body.title as string)?.trim();
      if (!title) return json({ error: 'Titre requis' }, 400);
      const cats = await getCategories(db);
      const zone = cats.some((c) => c.id === body.zone) ? (body.zone as string) : 'loisirs';
      await db
        .prepare(
          'INSERT INTO task_defs (id, title, zone, weight, recurrence, fixed_assignee, child_task, reminder_time, season, moment, pool) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          crypto.randomUUID(),
          title,
          zone,
          Number(body.weight) || 2,
          JSON.stringify(body.recurrence ?? { timesPerWeek: 1 }),
          (body.fixedAssignee as string) || null,
          body.childTask ? 1 : 0,
          (body.reminderTime as string) || null,
          (body.season as string) ?? 'all',
          asMoment(body.moment),
          body.pool ? 1 : 0,
        )
        .run();
      notify();
      return json(await buildState(env));
    }

    const taskDelMatch = path.match(/^\/tasks\/([^/]+)$/);
    if (taskDelMatch && method === 'DELETE') {
      const def = (await getTaskDefs(db)).find((d) => d.id === taskDelMatch[1]);
      if (!def) return json({ error: 'Tâche introuvable' }, 404);
      await db.batch([
        // On garde l'historique fait, on retire les occurrences à venir
        db.prepare("DELETE FROM occurrences WHERE def_id = ? AND status = 'todo' AND date >= ?").bind(def.id, today()),
        db.prepare('UPDATE occurrences SET def_id = NULL WHERE def_id = ?').bind(def.id),
        db.prepare('DELETE FROM task_defs WHERE id = ?').bind(def.id),
      ]);
      notify();
      return json(await buildState(env));
    }

    // Catégories personnalisées
    if (path === '/categories' && method === 'POST') {
      const body = await readBody(request);
      const label = (body.label as string)?.trim();
      if (!label) return json({ error: 'Nom requis' }, 400);
      const zone = SCENE_ZONES.includes(body.zone as (typeof SCENE_ZONES)[number]) ? (body.zone as string) : 'loisirs';
      await db
        .prepare('INSERT INTO categories (id, label, emoji, zone, builtin) VALUES (?, ?, ?, ?, 0)')
        .bind(crypto.randomUUID(), label, cleanEmoji(body.emoji as string), zone)
        .run();
      notify();
      return json(await buildState(env));
    }

    const catMatch = path.match(/^\/categories\/([^/]+)$/);
    if (catMatch && (method === 'PUT' || method === 'DELETE')) {
      const cat = (await getCategories(db)).find((c) => c.id === catMatch[1]);
      if (!cat) return json({ error: 'Catégorie introuvable' }, 404);
      if (method === 'DELETE') {
        if (cat.builtin) return json({ error: 'Les catégories du village ne peuvent pas être supprimées' }, 400);
        await db.batch([
          // Les tâches de la catégorie supprimée retournent aux loisirs
          db.prepare("UPDATE task_defs SET zone = 'loisirs' WHERE zone = ?").bind(cat.id),
          db.prepare("UPDATE occurrences SET zone = 'loisirs' WHERE zone = ?").bind(cat.id),
          db.prepare('DELETE FROM categories WHERE id = ?').bind(cat.id),
        ]);
      } else {
        const body = await readBody(request);
        const zone = SCENE_ZONES.includes(body.zone as (typeof SCENE_ZONES)[number]) ? (body.zone as string) : cat.zone;
        await db
          .prepare('UPDATE categories SET label = ?, emoji = ?, zone = ? WHERE id = ?')
          .bind(
            ((body.label as string) ?? cat.label).trim() || cat.label,
            cleanEmoji((body.emoji as string) || cat.emoji),
            cat.builtin ? cat.zone : zone,
            cat.id,
          )
          .run();
      }
      notify();
      return json(await buildState(env));
    }

    const taskMatch = path.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch && method === 'PUT') {
      const body = await readBody(request);
      const def = (await getTaskDefs(db)).find((d) => d.id === taskMatch[1]);
      if (!def) return json({ error: 'Tâche introuvable' }, 404);
      await db
        .prepare(
          'UPDATE task_defs SET title = ?, zone = ?, weight = ?, recurrence = ?, fixed_assignee = ?, child_task = ?, reminder_time = ?, season = ?, active = ?, moment = ?, pool = ? WHERE id = ?',
        )
        .bind(
          (body.title as string) ?? def.title,
          (body.zone as string) ?? def.zone,
          Number(body.weight) || def.weight,
          JSON.stringify(body.recurrence ?? def.recurrence),
          body.fixedAssignee === undefined ? (def.fixedAssignee ?? null) : ((body.fixedAssignee as string) || null),
          (body.childTask === undefined ? def.childTask : !!body.childTask) ? 1 : 0,
          body.reminderTime === undefined ? (def.reminderTime ?? null) : ((body.reminderTime as string) || null),
          (body.season as string) ?? def.season,
          (body.active === undefined ? def.active : !!body.active) ? 1 : 0,
          body.moment === undefined ? (def.moment ?? null) : asMoment(body.moment),
          (body.pool === undefined ? def.pool : !!body.pool) ? 1 : 0,
          def.id,
        )
        .run();
      notify();
      return json(await buildState(env));
    }

    // Réglages de la famille : objectif de la semaine, mode vacances
    if (path === '/settings' && method === 'PUT') {
      const body = await readBody(request);
      const stmts: D1PreparedStatement[] = [];
      if (body.weeklyGoal !== undefined) {
        const g = Math.round(Number(body.weeklyGoal) || 0);
        stmts.push(setSetting(db, 'weekly_goal', g > 0 ? String(g) : null));
      }
      if (body.goalReward !== undefined) stmts.push(setSetting(db, 'goal_reward', ((body.goalReward as string) ?? '').trim().slice(0, 80) || null));
      let pauseChanged = false;
      if (body.pauseUntil !== undefined) {
        pauseChanged = true;
        const until = isDate(body.pauseUntil) ? body.pauseUntil : null;
        const fromDate = until ? (isDate(body.pauseFrom) ? body.pauseFrom : today()) : null;
        stmts.push(setSetting(db, 'pause_until', until), setSetting(db, 'pause_from', fromDate));
        if (until && fromDate) {
          // Les tâches récurrentes non faites pendant les vacances disparaissent (rien ne s'accumule)
          stmts.push(
            db
              .prepare("DELETE FROM occurrences WHERE status = 'todo' AND def_id IS NOT NULL AND date >= ? AND date <= ?")
              .bind(fromDate, until),
          );
        }
      }
      if (stmts.length) await db.batch(stmts);
      if (pauseChanged) await generateWeek(env, weekStart(today()), today());
      notify();
      return json(await buildState(env));
    }

    // Code parent : protège la validation des missions enfant, la sortie du mode enfant et les récompenses
    if (path === '/pin' && method === 'POST') {
      const body = await readBody(request);
      const settings = await getSettings(db);
      if (!(await pinOk(settings.parentPin, body.oldPin))) return json({ error: 'Ancien code incorrect' }, 403);
      const pin = (body.pin as string) ?? '';
      if (pin && !/^\d{4}$/.test(pin)) return json({ error: 'Le code doit faire 4 chiffres' }, 400);
      await setSetting(db, 'parent_pin', pin ? await hashPin(pin) : null).run();
      notify();
      return json(await buildState(env));
    }

    if (path === '/pin/check' && method === 'POST') {
      const body = await readBody(request);
      const settings = await getSettings(db);
      return json({ ok: await pinOk(settings.parentPin, body.pin) });
    }

    // Récompenses (définies par les parents, obtenues avec les noisettes gagnées)
    if (path === '/rewards' && method === 'POST') {
      const body = await readBody(request);
      const title = (body.title as string)?.trim();
      const cost = Math.round(Number(body.cost) || 0);
      if (!title || cost <= 0) return json({ error: 'Nom et prix requis' }, 400);
      await db
        .prepare('INSERT INTO rewards (id, title, emoji, cost) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), title.slice(0, 60), cleanEmoji(body.emoji as string, '🎁'), cost)
        .run();
      notify();
      return json(await buildState(env));
    }

    const rewardMatch = path.match(/^\/rewards\/([^/]+)$/);
    if (rewardMatch && (method === 'PUT' || method === 'DELETE')) {
      const reward = await db.prepare('SELECT * FROM rewards WHERE id = ?').bind(rewardMatch[1]).first();
      if (!reward) return json({ error: 'Récompense introuvable' }, 404);
      if (method === 'DELETE') {
        await db.prepare('DELETE FROM rewards WHERE id = ?').bind(rewardMatch[1]).run();
      } else {
        const body = await readBody(request);
        await db
          .prepare('UPDATE rewards SET title = ?, emoji = ?, cost = ? WHERE id = ?')
          .bind(
            ((body.title as string) ?? (reward.title as string)).trim().slice(0, 60) || (reward.title as string),
            cleanEmoji((body.emoji as string) || (reward.emoji as string), '🎁'),
            Math.round(Number(body.cost) || (reward.cost as number)),
            rewardMatch[1],
          )
          .run();
      }
      notify();
      return json(await buildState(env));
    }

    const claimMatch = path.match(/^\/rewards\/([^/]+)\/claim$/);
    if (claimMatch && method === 'POST') {
      const body = await readBody(request);
      const settings = await getSettings(db);
      if (!(await pinOk(settings.parentPin, body.pin))) return json({ error: 'Code parent incorrect' }, 403);
      const reward = await db.prepare('SELECT * FROM rewards WHERE id = ?').bind(claimMatch[1]).first();
      const memberId = body.memberId as string;
      if (!reward || !memberId) return json({ error: 'Récompense introuvable' }, 404);
      const earned = await db
        .prepare("SELECT COALESCE(SUM(weight), 0) AS t FROM occurrences WHERE status = 'done' AND assignee = ?")
        .bind(memberId)
        .first();
      const spent = await db.prepare('SELECT COALESCE(SUM(cost), 0) AS t FROM reward_claims WHERE member_id = ?').bind(memberId).first();
      const balance = ((earned?.t as number) ?? 0) - ((spent?.t as number) ?? 0);
      if (balance < (reward.cost as number)) return json({ error: 'Pas encore assez de noisettes' }, 400);
      await db
        .prepare('INSERT INTO reward_claims (id, member_id, title, emoji, cost, claimed_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), memberId, reward.title, reward.emoji, reward.cost, new Date().toISOString())
        .run();
      notify();
      return json(await buildState(env));
    }

    // Remise à zéro complète du village (irréversible)
    if (path === '/reset' && method === 'POST') {
      const body = await readBody(request);
      if (body.confirm !== 'EFFACER') return json({ error: 'Confirmation manquante' }, 400);
      await db.batch([
        db.prepare('DELETE FROM occurrences'),
        db.prepare('DELETE FROM shopping_items'),
        db.prepare('DELETE FROM purchase_history'),
        db.prepare('DELETE FROM progress'),
        db.prepare('DELETE FROM push_subs'),
        db.prepare('DELETE FROM task_defs'),
        db.prepare('DELETE FROM village'),
        db.prepare('DELETE FROM categories WHERE builtin = 0'),
        db.prepare('DELETE FROM thanks'),
        db.prepare('DELETE FROM swaps'),
        db.prepare('DELETE FROM rewards'),
        db.prepare('DELETE FROM reward_claims'),
        db.prepare('DELETE FROM settings'),
        db.prepare('DELETE FROM members'),
      ]);
      notify();
      return json(await buildState(env));
    }

    if (path === '/push/subscribe' && method === 'POST') {
      const body = await readBody(request);
      const sub = body.subscription as { endpoint: string; keys: Record<string, string> };
      if (!sub?.endpoint) return json({ error: 'Abonnement invalide' }, 400);
      await db
        .prepare(
          'INSERT INTO push_subs (member_id, endpoint, keys) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET member_id = excluded.member_id, keys = excluded.keys',
        )
        .bind(body.memberId as string, sub.endpoint, JSON.stringify(sub.keys))
        .run();
      return json({ ok: true });
    }

    const prefsMatch = path.match(/^\/members\/([^/]+)\/prefs$/);
    if (prefsMatch && method === 'POST') {
      const body = await readBody(request);
      await db
        .prepare('UPDATE members SET notif_prefs = ? WHERE id = ?')
        .bind(JSON.stringify({ morning: !!body.morning, evening: !!body.evening }), prefsMatch[1])
        .run();
      notify();
      return json(await buildState(env));
    }

    return json({ error: 'Introuvable' }, 404);
  } catch (e) {
    console.error('Erreur API', path, e);
    return json({ error: 'Erreur interne' }, 500);
  }
}
