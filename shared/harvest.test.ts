import { describe, it, expect } from 'vitest';
import { harvestMessage, weekRecap, isAvailable } from './harvest';
import type { Member, Occurrence } from './types';

const WEEK = '2026-07-20'; // lundi
const m = (id: string, role: Member['role'] = 'adult', extra: Partial<Member> = {}): Member => ({
  id,
  name: id,
  creature: 'renard',
  role,
  color: '#000',
  notifPrefs: { morning: true, evening: true },
  ...extra,
});
let n = 0;
const occ = (assignee: string | null, date: string, weight: number, status: Occurrence['status'] = 'todo'): Occurrence => ({
  id: `o${n++}`,
  defId: null,
  title: 't',
  zone: 'cuisine',
  weight,
  date,
  assignee,
  status,
});

describe('harvestMessage', () => {
  const papa = m('Papa');
  const maman = m('Maman');

  it('message de départ quand rien n\'est fait', () => {
    expect(harvestMessage([papa, maman], [occ('Papa', WEEK, 2)], WEEK)).toMatch(/première mission/);
  });

  it('ne juge personne en début de semaine (lundi à mercredi)', () => {
    const week = [occ('Papa', WEEK, 5, 'done'), occ('Papa', '2026-07-21', 5, 'done'), occ('Maman', '2026-07-21', 6)];
    const msg = harvestMessage([papa, maman], week, '2026-07-22');
    expect(msg).not.toMatch(/Maman|Papa/);
  });

  it("ne compare pas les noisettes brutes : quelqu'un à jour n'est pas pointé", () => {
    // Jeudi : Papa a beaucoup fait, Maman a ses tâches plus tard dans la semaine (rien en retard)
    const week = [occ('Papa', WEEK, 5, 'done'), occ('Papa', '2026-07-21', 5, 'done'), occ('Maman', '2026-07-25', 6)];
    const msg = harvestMessage([papa, maman], week, '2026-07-23');
    expect(msg).not.toMatch(/Maman/);
    expect(msg).toMatch(/bravo/i);
  });

  it('propose un coup de main à qui a du retard (à partir de jeudi)', () => {
    const week = [occ('Papa', WEEK, 5, 'done'), occ('Maman', WEEK, 3), occ('Maman', '2026-07-21', 4)];
    const msg = harvestMessage([papa, maman], week, '2026-07-23');
    expect(msg).toMatch(/Maman/);
    expect(msg).toMatch(/coup de main/);
  });

  it('foyer solo : félicite l\'adulte et cite les enfants qui aident', () => {
    const week = [occ('Papa', WEEK, 3, 'done'), occ('Léo', WEEK, 1, 'done')];
    const msg = harvestMessage([papa, m('Léo', 'child')], week, WEEK);
    expect(msg).toMatch(/Papa/);
    expect(msg).toMatch(/Léo/);
  });
});

describe('weekRecap', () => {
  it('totalise les noisettes et missions par personne', () => {
    const week = [occ('A', WEEK, 3, 'done'), occ('B', WEEK, 2, 'done'), occ('A', WEEK, 1), occ('B', WEEK, 1, 'done')];
    const r = weekRecap(week, ['A', 'B']);
    expect(r.total).toBe(6);
    expect(r.missions).toBe(3);
    expect(r.perMember).toEqual({ A: 3, B: 3 });
  });
});

describe('isAvailable', () => {
  it('absent jusqu\'à une date incluse', () => {
    const p = m('P', 'adult', { awayUntil: '2026-07-22' });
    expect(isAvailable(p, '2026-07-22')).toBe(false);
    expect(isAvailable(p, '2026-07-23')).toBe(true);
  });
  it('jours chargés', () => {
    const p = m('P', 'adult', { busyDays: [1] }); // mardi
    expect(isAvailable(p, '2026-07-21')).toBe(false);
    expect(isAvailable(p, '2026-07-22')).toBe(true);
  });
});
