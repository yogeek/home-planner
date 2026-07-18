import { describe, it, expect } from 'vitest';
import { suggest, frequentItems } from './shopping';
import type { Purchase } from './types';

const p = (label: string, date: string): Purchase => ({ label, purchasedAt: date + 'T10:00:00Z' });

describe('suggest', () => {
  it('vide sans historique', () => {
    expect(suggest([], '2026-07-20T00:00:00Z')).toEqual([]);
  });

  it('ignore les articles achetés moins de 3 fois', () => {
    const h = [p('lait', '2026-07-01'), p('lait', '2026-07-08')];
    expect(suggest(h, '2026-07-20T00:00:00Z')).toEqual([]);
  });

  it('suggère quand l\'intervalle médian est écoulé', () => {
    const h = [p('lait', '2026-06-22'), p('lait', '2026-06-29'), p('lait', '2026-07-06')];
    // intervalle médian 7 jours, dernier achat le 6 → dû depuis le 13
    expect(suggest(h, '2026-07-20T00:00:00Z')).toEqual(['lait']);
    expect(suggest(h, '2026-07-08T00:00:00Z')).toEqual([]);
  });

  it('gère les achats du même jour (déduplication)', () => {
    const h = [p('pain', '2026-07-01'), p('pain', '2026-07-01'), p('pain', '2026-07-05'), p('pain', '2026-07-09')];
    expect(suggest(h, '2026-07-15T00:00:00Z')).toEqual(['pain']);
  });
});

describe('frequentItems', () => {
  it('classe par fréquence, limite à 12', () => {
    const h: Purchase[] = [];
    for (let i = 0; i < 15; i++) h.push(p(`item${i}`, '2026-07-01'));
    for (let i = 0; i < 3; i++) h.push(p('lait', `2026-07-0${i + 1}`));
    const top = frequentItems(h);
    expect(top[0]).toBe('lait');
    expect(top.length).toBeLessThanOrEqual(12);
  });
});
