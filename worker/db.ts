import type {
  Category,
  Member,
  MemberProgress,
  Occurrence,
  Purchase,
  ShoppingItem,
  TaskDef,
} from '../shared/types';

type Row = Record<string, unknown>;

export function rowToMember(r: Row): Member {
  return {
    id: r.id as string,
    name: r.name as string,
    creature: r.creature as string,
    role: r.role as 'adult' | 'child',
    color: r.color as string,
    notifPrefs: JSON.parse((r.notif_prefs as string) || '{}'),
  };
}

export function rowToTaskDef(r: Row): TaskDef {
  return {
    id: r.id as string,
    title: r.title as string,
    zone: r.zone as TaskDef['zone'],
    weight: r.weight as number,
    recurrence: JSON.parse((r.recurrence as string) || '{}'),
    fixedAssignee: (r.fixed_assignee as string) || null,
    childTask: !!r.child_task,
    reminderTime: (r.reminder_time as string) || null,
    season: r.season as TaskDef['season'],
    active: !!r.active,
  };
}

export function rowToOccurrence(r: Row): Occurrence {
  return {
    id: r.id as string,
    defId: (r.def_id as string) || null,
    title: r.title as string,
    zone: r.zone as Occurrence['zone'],
    weight: r.weight as number,
    date: r.date as string,
    assignee: r.assignee as string,
    status: r.status as Occurrence['status'],
    doneAt: (r.done_at as string) || null,
    doneBy: (r.done_by as string) || null,
    validatedBy: (r.validated_by as string) || null,
    manual: !!r.manual,
  };
}

export function rowToShoppingItem(r: Row): ShoppingItem {
  return {
    id: r.id as string,
    label: r.label as string,
    aisle: r.aisle as ShoppingItem['aisle'],
    status: r.status as ShoppingItem['status'],
    addedBy: r.added_by as string,
    addedAt: r.added_at as string,
  };
}

export function rowToProgress(r: Row): MemberProgress {
  return {
    memberId: r.member_id as string,
    streak: r.streak as number,
    bestStreak: r.best_streak as number,
    lastActiveDate: (r.last_active_date as string) || null,
    milestones: JSON.parse((r.milestones as string) || '[]'),
  };
}

export async function getMembers(db: D1Database): Promise<Member[]> {
  const { results } = await db.prepare('SELECT * FROM members ORDER BY created_at').all();
  return results.map(rowToMember);
}

export async function getTaskDefs(db: D1Database, activeOnly = false): Promise<TaskDef[]> {
  const sql = activeOnly ? 'SELECT * FROM task_defs WHERE active = 1' : 'SELECT * FROM task_defs';
  const { results } = await db.prepare(sql).all();
  return results.map(rowToTaskDef);
}

export async function getOccurrencesBetween(db: D1Database, from: string, to: string): Promise<Occurrence[]> {
  const { results } = await db
    .prepare('SELECT * FROM occurrences WHERE date >= ? AND date <= ? ORDER BY date, weight DESC')
    .bind(from, to)
    .all();
  return results.map(rowToOccurrence);
}

export async function getOccurrence(db: D1Database, id: string): Promise<Occurrence | null> {
  const r = await db.prepare('SELECT * FROM occurrences WHERE id = ?').bind(id).first();
  return r ? rowToOccurrence(r as Row) : null;
}

export async function getOpenShopping(db: D1Database): Promise<ShoppingItem[]> {
  const { results } = await db
    .prepare("SELECT * FROM shopping_items WHERE status IN ('open','checked') ORDER BY added_at")
    .all();
  return results.map(rowToShoppingItem);
}

export async function getPurchases(db: D1Database): Promise<Purchase[]> {
  const { results } = await db
    .prepare('SELECT label, purchased_at FROM purchase_history ORDER BY purchased_at DESC LIMIT 2000')
    .all();
  return results.map((r) => ({ label: r.label as string, purchasedAt: r.purchased_at as string }));
}

export async function getVillage(db: D1Database): Promise<{ acorns: number; zoneLastDone: Record<string, string> }> {
  const r = await db.prepare('SELECT * FROM village WHERE id = 1').first();
  if (!r) return { acorns: 0, zoneLastDone: {} };
  return { acorns: r.acorns as number, zoneLastDone: JSON.parse((r.zone_last_done as string) || '{}') };
}

export function rowToCategory(r: Row): Category {
  return {
    id: r.id as string,
    label: r.label as string,
    emoji: r.emoji as string,
    zone: r.zone as Category['zone'],
    builtin: !!r.builtin,
  };
}

export async function getCategories(db: D1Database): Promise<Category[]> {
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY builtin DESC, label').all();
  return results.map(rowToCategory);
}

export async function getAllProgress(db: D1Database): Promise<MemberProgress[]> {
  const { results } = await db.prepare('SELECT * FROM progress').all();
  return results.map(rowToProgress);
}
