import { describe, it, expect } from 'vitest';
import { guessAisle } from './aisles';

describe('guessAisle', () => {
  it('reconnaît les articles courants', () => {
    expect(guessAisle('Lait')).toBe('frais');
    expect(guessAisle('Pain')).toBe('épicerie');
    expect(guessAisle('Tomates')).toBe('fruits & légumes');
    expect(guessAisle('Poulet')).toBe('frais');
    expect(guessAisle('Fromage râpé')).toBe('frais');
    expect(guessAisle('Oeufs')).toBe('frais');
    expect(guessAisle('Jus de mangue')).toBe('boissons');
    expect(guessAisle('Papier toilette')).toBe('hygiène');
    expect(guessAisle('Liquide vaisselle')).toBe('maison');
  });

  it('ignore accents et majuscules', () => {
    expect(guessAisle('PÂTES')).toBe('épicerie');
    expect(guessAisle('crème fraîche')).toBe('frais');
  });

  it('« autre » pour un article inconnu', () => {
    expect(guessAisle('Truc bizarre')).toBe('autre');
  });

  it('les boissons priment (jus de tomate = boisson, pas légume)', () => {
    expect(guessAisle('Jus de tomate')).toBe('boissons');
  });
});
