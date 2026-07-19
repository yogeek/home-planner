import { describe, it, expect } from 'vitest';
import { levelFor, freshness, weekContributions, updateStreak, LEVELS } from './village';
import type { Occurrence, MemberProgress } from './types';

describe('levelFor', () => {
  it('niveau 0 à zéro gland', () => {
    const l = levelFor(0);
    expect(l.level).toBe(0);
    expect(l.unlocked).toEqual([]);
    expect(l.nextCost).toBe(LEVELS[0].cost);
    expect(l.progress).toBe(0);
  });

  it('monte de niveau au seuil et débloque', () => {
    const l = levelFor(LEVELS[0].cost);
    expect(l.level).toBe(1);
    expect(l.unlocked).toEqual([LEVELS[0].unlock]);
  });

  it('progress est une fraction du niveau courant', () => {
    const half = LEVELS[0].cost / 2;
    expect(levelFor(half).progress).toBeCloseTo(0.5);
  });

  it('plafonne au dernier niveau', () => {
    const total = LEVELS.reduce((s, l) => s + l.cost, 0);
    const l = levelFor(total + 9999);
    expect(l.level).toBe(LEVELS.length);
    expect(l.nextCost).toBeNull();
    expect(l.unlocked).toHaveLength(LEVELS.length);
  });
});

describe('freshness', () => {
  const now = '2026-07-20T08:00:00Z';
  it('100 juste après une tâche', () => {
    expect(freshness('2026-07-20T07:00:00Z', now)).toBe(100);
  });
  it('décroît de 12 par jour', () => {
    expect(freshness('2026-07-17T08:00:00Z', now)).toBe(64);
  });
  it('plancher à 15', () => {
    expect(freshness('2026-01-01T00:00:00Z', now)).toBe(15);
  });
  it('jamais fait = 55 (neutre)', () => {
    expect(freshness(null, now)).toBe(55);
  });
});

describe('weekContributions', () => {
  const occ = (assignee: string, weight: number, status: 'done' | 'todo' = 'done'): Occurrence => ({
    id: Math.random().toString(),
    defId: null,
    title: 't',
    zone: 'cuisine',
    weight,
    date: '2026-07-20',
    assignee,
    status,
  });

  it('somme les glands faits par chaque membre (todo ignoré)', () => {
    const c = weekContributions([occ('a', 3), occ('a', 2), occ('b', 4), occ('b', 1, 'todo'), occ('kid', 1)], ['a', 'b', 'kid']);
    expect(c).toEqual({ a: 5, b: 4, kid: 1 });
  });

  it('tous les membres présents, même à zéro', () => {
    expect(weekContributions([], ['a', 'b', 'c'])).toEqual({ a: 0, b: 0, c: 0 });
  });
});

describe('updateStreak', () => {
  const base: MemberProgress = { memberId: 'a', streak: 3, bestStreak: 5, lastActiveDate: '2026-07-19', milestones: [] };

  it('incrémente si jour consécutif', () => {
    const p = updateStreak(base, '2026-07-20');
    expect(p.streak).toBe(4);
  });
  it('ne change pas si même jour', () => {
    expect(updateStreak(base, '2026-07-19').streak).toBe(3);
  });
  it('repart à 1 après un trou', () => {
    const p = updateStreak(base, '2026-07-22');
    expect(p.streak).toBe(1);
  });
  it('met à jour bestStreak', () => {
    const p = updateStreak({ ...base, streak: 5 }, '2026-07-20');
    expect(p.bestStreak).toBe(6);
  });
});
