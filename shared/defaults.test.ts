import { describe, it, expect } from 'vitest';
import { defaultTaskDefs } from './defaults';

describe('defaultTaskDefs', () => {
  it('sans piscine : aucune tâche piscine', () => {
    expect(defaultTaskDefs({ garden: true, pool: false, pet: false }).some((d) => d.zone === 'piscine')).toBe(false);
  });
  it('sans jardin : pas de tonte, mais les plantes restent', () => {
    const defs = defaultTaskDefs({ garden: false, pool: false, pet: false });
    expect(defs.some((d) => d.title === 'Tondre la pelouse')).toBe(false);
    expect(defs.some((d) => d.title === 'Arroser les plantes')).toBe(true);
  });
  it('avec un animal : tâches animaux ajoutées, dont une mission enfant', () => {
    const defs = defaultTaskDefs({ garden: false, pool: false, pet: true });
    expect(defs.some((d) => d.title === "Nourrir l'animal")).toBe(true);
    expect(defs.some((d) => d.childTask && d.title.includes('animal'))).toBe(true);
  });
});
