import { describe, it, expect } from 'vitest';
import { expandWeek, distributeWeek } from './schedule';
import { weekStart, addDays, dayOfWeek, seasonOf, localDate } from './dates';
import type { TaskDef, Slot } from './types';

const WEEK = '2026-07-20'; // un lundi

function def(partial: Partial<TaskDef> & { id: string }): TaskDef {
  return {
    title: partial.id,
    zone: 'cuisine',
    weight: 2,
    recurrence: {},
    childTask: false,
    season: 'all',
    active: true,
    ...partial,
  };
}

describe('dates', () => {
  it('weekStart retourne le lundi', () => {
    expect(weekStart('2026-07-22')).toBe('2026-07-20'); // mercredi → lundi
    expect(weekStart('2026-07-20')).toBe('2026-07-20');
    expect(weekStart('2026-07-26')).toBe('2026-07-20'); // dimanche → lundi
  });
  it('dayOfWeek : 0 = lundi, 6 = dimanche', () => {
    expect(dayOfWeek('2026-07-20')).toBe(0);
    expect(dayOfWeek('2026-07-26')).toBe(6);
  });
  it('localDate applique UTC+4', () => {
    expect(localDate('2026-07-18T21:30:00Z')).toBe('2026-07-19');
    expect(localDate('2026-07-18T10:00:00Z')).toBe('2026-07-18');
  });
  it('seasonOf : juillet = hiver austral, décembre = été', () => {
    expect(seasonOf('2026-07-20')).toBe('winter');
    expect(seasonOf('2026-12-20')).toBe('summer');
  });
});

describe('expandWeek', () => {
  it('daysOfWeek épingle les dates', () => {
    const slots = expandWeek([def({ id: 'poubelles', recurrence: { daysOfWeek: [1] } })], WEEK, 'winter');
    expect(slots).toHaveLength(1);
    expect(slots[0].date).toBe(addDays(WEEK, 1)); // mardi
  });

  it('timesPerWeek répartit uniformément sur la semaine', () => {
    const slots = expandWeek([def({ id: 'lessive', recurrence: { timesPerWeek: 3 } })], WEEK, 'winter');
    expect(slots.map((s) => dayOfWeek(s.date))).toEqual([0, 2, 4]);
  });

  it('timesPerWeek 7 = tous les jours', () => {
    const slots = expandWeek([def({ id: 'repas', recurrence: { timesPerWeek: 7 } })], WEEK, 'winter');
    expect(slots).toHaveLength(7);
  });

  it('filtre par saison', () => {
    const defs = [def({ id: 'robot', season: 'summer', recurrence: { timesPerWeek: 1 } })];
    expect(expandWeek(defs, WEEK, 'winter')).toHaveLength(0);
    expect(expandWeek(defs, WEEK, 'summer')).toHaveLength(1);
  });

  it('ignore les définitions inactives', () => {
    expect(expandWeek([def({ id: 'x', active: false, recurrence: { timesPerWeek: 1 } })], WEEK, 'winter')).toHaveLength(0);
  });

  it('récurrence fractionnaire : présente une semaine sur deux, déterministe', () => {
    const defs = [def({ id: 'draps', recurrence: { timesPerWeek: 0.5 } })];
    const inW1 = expandWeek(defs, WEEK, 'winter').length;
    const inW2 = expandWeek(defs, addDays(WEEK, 7), 'winter').length;
    const inW3 = expandWeek(defs, addDays(WEEK, 14), 'winter').length;
    expect(inW1 + inW2).toBe(1); // une seule des deux semaines
    expect(inW3).toBe(inW1); // périodique
  });
});

describe('distributeWeek', () => {
  const A = 'alice';
  const B = 'bob';
  const KID = 'kid';

  function slot(partial: Partial<Slot> & { defId: string }): Slot {
    return { title: partial.defId, zone: 'cuisine', weight: 2, date: WEEK, childTask: false, ...partial };
  }

  it('les tâches enfant vont à l\'enfant', () => {
    const occs = distributeWeek([slot({ defId: 'jouets', childTask: true })], [A, B], [KID], {});
    expect(occs[0].assignee).toBe(KID);
  });

  it('sans enfant, les tâches enfant sont ignorées', () => {
    expect(distributeWeek([slot({ defId: 'jouets', childTask: true })], [A, B], [], {})).toHaveLength(0);
  });

  it('répartit les tâches enfant entre plusieurs enfants', () => {
    const K2 = 'kid2';
    const slots = [
      slot({ defId: 'j1', childTask: true, weight: 2 }),
      slot({ defId: 'j2', childTask: true, weight: 2 }),
    ];
    const occs = distributeWeek(slots, [A, B], [KID, K2], {});
    expect(new Set(occs.map((o) => o.assignee))).toEqual(new Set([KID, K2]));
  });

  it('fixedAssignee est respecté', () => {
    const occs = distributeWeek([slot({ defId: 'poubelles', fixedAssignee: B })], [A, B], [], {});
    expect(occs[0].assignee).toBe(B);
  });

  it('équilibre la charge pondérée entre les deux adultes', () => {
    const slots = [
      slot({ defId: 'a', weight: 5 }),
      slot({ defId: 'b', weight: 4 }),
      slot({ defId: 'c', weight: 3 }),
      slot({ defId: 'd', weight: 2 }),
      slot({ defId: 'e', weight: 2 }),
    ];
    const occs = distributeWeek(slots, [A, B], [], {});
    const load = (m: string) => occs.filter((o) => o.assignee === m).reduce((s, o) => s + o.weight, 0);
    expect(Math.abs(load(A) - load(B))).toBeLessThanOrEqual(2);
  });

  it('parent solo : tout va à l\'unique adulte', () => {
    const slots = [slot({ defId: 'a', weight: 3 }), slot({ defId: 'b', weight: 2 })];
    const occs = distributeWeek(slots, [A], [], {});
    expect(occs.every((o) => o.assignee === A)).toBe(true);
  });

  it('trois adultes : la charge est répartie entre les trois', () => {
    const C = 'carol';
    const slots = Array.from({ length: 9 }, (_, i) => slot({ defId: `t${i}`, weight: 2 }));
    const occs = distributeWeek(slots, [A, B, C], [], {});
    const load = (m: string) => occs.filter((o) => o.assignee === m).reduce((s, o) => s + o.weight, 0);
    expect(load(A)).toBeGreaterThan(0);
    expect(load(B)).toBeGreaterThan(0);
    expect(load(C)).toBeGreaterThan(0);
    expect(Math.max(load(A), load(B), load(C)) - Math.min(load(A), load(B), load(C))).toBeLessThanOrEqual(2);
  });

  it('sans adulte, rien n\'est distribué', () => {
    expect(distributeWeek([slot({ defId: 'a' })], [], [], {})).toHaveLength(0);
  });

  it('fait tourner une corvée impopulaire (rotation vs lastAssignee)', () => {
    const slots = [slot({ defId: 'salle-de-bain', weight: 4 })];
    const occs = distributeWeek(slots, [A, B], [], { 'salle-de-bain': A });
    expect(occs[0].assignee).toBe(B);
  });

  it('est déterministe', () => {
    const slots = [slot({ defId: 'a', weight: 3 }), slot({ defId: 'b', weight: 3 })];
    const r1 = distributeWeek(slots, [A, B], [], {});
    const r2 = distributeWeek(slots, [A, B], [], {});
    expect(r1).toEqual(r2);
  });

  it('les occurrences produites sont complètes et en statut todo', () => {
    const occs = distributeWeek([slot({ defId: 'a' })], [A, B], [], {});
    expect(occs[0]).toMatchObject({ defId: 'a', status: 'todo', zone: 'cuisine', weight: 2, date: WEEK });
    expect(occs[0].id).toBeTruthy();
  });
});
