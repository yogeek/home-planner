import type { Env } from './index';
import { localDate, weekStart, addDays } from '../shared/dates';
import { freshness, levelFor, updateStreak, weekBalance } from '../shared/village';
import { suggest, frequentItems } from '../shared/shopping';
import { DEFAULT_TASK_DEFS } from '../shared/defaults';
import { AISLES, SCENE_ZONES } from '../shared/types';
import { guessAisle } from '../shared/aisles';
import {
  getAllProgress,
  getCategories,
  getMembers,
  getOccurrence,
  getOccurrencesBetween,
  getOpenShopping,
  getPurchases,
  getTaskDefs,
  getVillage,
  rowToProgress,
} from './db';
import { generateWeek } from './week';

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
function cleanEmoji(raw: string | undefined): string {
  const chars = Array.from((raw ?? '').trim());
  return chars.length ? chars.slice(0, 4).join('') : '⭐';
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function buildState(env: Env): Promise<Record<string, unknown>> {
  const db = env.DB;
  const now = new Date().toISOString();
  const today = localDate(now);
  const ws = weekStart(today);
  const we = addDays(ws, 6);

  const [members, village, weekOccs, shopping, purchases, progress, taskDefs, categories] = await Promise.all([
    getMembers(db),
    getVillage(db),
    getOccurrencesBetween(db, ws, we),
    getOpenShopping(db),
    getPurchases(db),
    getAllProgress(db),
    getTaskDefs(db),
    getCategories(db),
  ]);

  const adults = members.filter((m) => m.role === 'adult');
  const { results: monthRows } = await db
    .prepare(
      "SELECT assignee, SUM(weight) AS total, COUNT(*) AS n FROM occurrences WHERE status = 'done' AND date >= ? GROUP BY assignee",
    )
    .bind(addDays(today, -27))
    .all();
  const monthTotals: Record<string, { total: number; count: number }> = {};
  for (const r of monthRows) monthTotals[r.assignee as string] = { total: r.total as number, count: r.n as number };

  const zoneFreshness: Record<string, number> = {};
  for (const zone of SCENE_ZONES) zoneFreshness[zone] = freshness(village.zoneLastDone[zone] ?? null, now);

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
    shopping,
    suggestions: suggest(purchases, now),
    frequent: frequentItems(purchases),
    progress,
    balance: adults.length >= 2 ? weekBalance(weekOccs, [adults[0].id, adults[1].id]) : null,
    monthTotals,
    taskDefs,
    categories,
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

  try {
    if (path === '/state' && method === 'GET') {
      return json(await buildState(env));
    }

    if (path === '/onboard' && method === 'POST') {
      const body = await readBody(request);
      const existing = await getMembers(db);
      if (existing.length > 0) return json({ error: 'Déjà configuré' }, 409);
      const membersIn = body.members as { name: string; creature: string; role: 'adult' | 'child' }[];
      if (!membersIn?.length) return json({ error: 'Membres manquants' }, 400);

      const now = new Date().toISOString();
      const stmts: D1PreparedStatement[] = [];
      for (const m of membersIn) {
        const id = crypto.randomUUID();
        stmts.push(
          db
            .prepare('INSERT INTO members (id, name, creature, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, m.name, m.creature, m.role, CREATURE_COLORS[m.creature] ?? '#3E5C40', now),
        );
        stmts.push(db.prepare('INSERT INTO progress (member_id) VALUES (?)').bind(id));
      }
      for (const d of DEFAULT_TASK_DEFS) {
        stmts.push(
          db
            .prepare(
              'INSERT INTO task_defs (id, title, zone, weight, recurrence, child_task, reminder_time, season) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
            ),
        );
      }
      stmts.push(db.prepare("INSERT INTO village (id, acorns, zone_last_done) VALUES (1, 0, '{}')"));
      await db.batch(stmts);
      await generateWeek(env, weekStart(localDate(now)), localDate(now));
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
        await db.batch(group.map((o) => db.prepare('DELETE FROM occurrences WHERE id = ?').bind(o.id)));
      } else {
        const body = await readBody(request);
        const cats = await getCategories(db);
        const zone = cats.some((c) => c.id === body.zone) ? (body.zone as string) : occ.zone;
        await db
          .prepare('UPDATE occurrences SET title = ?, zone = ?, weight = ?, manual = 1 WHERE id = ?')
          .bind(((body.title as string) ?? occ.title).trim() || occ.title, zone, Number(body.weight) || occ.weight, occ.id)
          .run();
      }
      notify();
      return json(await buildState(env));
    }

    // /occurrences/:id/(done|undo|move|skip) et POST /occurrences
    const occMatch = path.match(/^\/occurrences\/([^/]+)\/(done|undo|move|skip)$/);
    if (occMatch && method === 'POST') {
      const [, id, action] = occMatch;
      const occ = await getOccurrence(db, id);
      if (!occ) return json({ error: 'Occurrence introuvable' }, 404);
      const body = await readBody(request);
      const now = new Date().toISOString();

      if (action === 'done') {
        if (occ.status === 'done') return json({ ok: true });
        const doneBy = (body.byMemberId as string) ?? occ.assignee;
        await db
          .prepare("UPDATE occurrences SET status = 'done', done_at = ?, done_by = ?, validated_by = ? WHERE id = ?")
          .bind(now, doneBy, (body.validatedBy as string) ?? null, id)
          .run();
        const village = await getVillage(db);
        const categories = await getCategories(db);
        const sceneZone = categories.find((c) => c.id === occ.zone)?.zone ?? 'loisirs';
        village.zoneLastDone[sceneZone] = now;
        await db
          .prepare('UPDATE village SET acorns = acorns + ?, zone_last_done = ? WHERE id = 1')
          .bind(occ.weight, JSON.stringify(village.zoneLastDone))
          .run();
        const pr = await db.prepare('SELECT * FROM progress WHERE member_id = ?').bind(occ.assignee).first();
        if (pr) {
          const updated = updateStreak(rowToProgress(pr as Record<string, unknown>), localDate(now));
          await db
            .prepare('UPDATE progress SET streak = ?, best_streak = ?, last_active_date = ? WHERE member_id = ?')
            .bind(updated.streak, updated.bestStreak, updated.lastActiveDate, occ.assignee)
            .run();
        }
      } else if (action === 'undo') {
        if (occ.status !== 'done') return json({ ok: true });
        await db
          .prepare("UPDATE occurrences SET status = 'todo', done_at = NULL, done_by = NULL, validated_by = NULL WHERE id = ?")
          .bind(id)
          .run();
        await db.prepare('UPDATE village SET acorns = MAX(0, acorns - ?) WHERE id = 1').bind(occ.weight).run();
      } else if (action === 'move') {
        await db
          .prepare('UPDATE occurrences SET date = ?, assignee = ?, manual = 1 WHERE id = ?')
          .bind((body.date as string) ?? occ.date, (body.assignee as string) ?? occ.assignee, id)
          .run();
      } else if (action === 'skip') {
        await db.prepare("UPDATE occurrences SET status = 'skipped' WHERE id = ?").bind(id).run();
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
      const date = (body.date as string) ?? localDate(new Date().toISOString());
      const weight = Number(body.weight) || 2;

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
              'INSERT INTO occurrences (id, def_id, title, zone, weight, date, assignee, status, manual, group_id) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ?)',
            )
            .bind(crypto.randomUUID(), title, zone, weight, date, a, 'todo', groupId),
        ),
      );
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
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO purchase_history (label, aisle, purchased_at) SELECT label, aisle, ? FROM shopping_items WHERE status = 'checked'",
          )
          .bind(now),
        db.prepare("DELETE FROM shopping_items WHERE status = 'checked'"),
      ]);
      notify();
      return json(await buildState(env));
    }

    if (path === '/week/regenerate' && method === 'POST') {
      const body = await readBody(request);
      const today = localDate(new Date().toISOString());
      const ws = (body.weekStart as string) ?? weekStart(today);
      await generateWeek(env, ws, today);
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
          'INSERT INTO task_defs (id, title, zone, weight, recurrence, fixed_assignee, child_task, reminder_time, season) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          crypto.randomUUID(),
          title,
          zone,
          Number(body.weight) || 2,
          JSON.stringify(body.recurrence ?? { timesPerWeek: 1 }),
          (body.fixedAssignee as string) ?? null,
          body.childTask ? 1 : 0,
          (body.reminderTime as string) ?? null,
          (body.season as string) ?? 'all',
        )
        .run();
      notify();
      return json(await buildState(env));
    }

    const taskDelMatch = path.match(/^\/tasks\/([^/]+)$/);
    if (taskDelMatch && method === 'DELETE') {
      const def = (await getTaskDefs(db)).find((d) => d.id === taskDelMatch[1]);
      if (!def) return json({ error: 'Tâche introuvable' }, 404);
      const today = localDate(new Date().toISOString());
      await db.batch([
        // On garde l'historique fait, on retire les occurrences à venir
        db.prepare("DELETE FROM occurrences WHERE def_id = ? AND status = 'todo' AND date >= ?").bind(def.id, today),
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
          'UPDATE task_defs SET title = ?, zone = ?, weight = ?, recurrence = ?, fixed_assignee = ?, child_task = ?, reminder_time = ?, season = ?, active = ? WHERE id = ?',
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
          def.id,
        )
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
