import type { Occurrence, Slot, TaskDef } from './types';
import { addDays, isoWeek } from './dates';

/** Petit hachage déterministe pour décaler les récurrences fractionnaires */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Jour par défaut des tâches peu fréquentes : samedi */
const LOW_FREQ_DAY = 5;

export function expandWeek(defs: TaskDef[], weekStart: string, season: 'summer' | 'winter'): Slot[] {
  const slots: Slot[] = [];
  for (const def of defs) {
    if (!def.active) continue;
    if (def.season !== 'all' && def.season !== season) continue;

    const toSlot = (date: string): Slot => ({
      defId: def.id,
      title: def.title,
      zone: def.zone,
      weight: def.weight,
      date,
      fixedAssignee: def.fixedAssignee ?? null,
      childTask: def.childTask,
    });

    const { daysOfWeek, timesPerWeek } = def.recurrence;
    if (daysOfWeek && daysOfWeek.length > 0) {
      for (const day of daysOfWeek) slots.push(toSlot(addDays(weekStart, day)));
    } else if (timesPerWeek && timesPerWeek >= 1) {
      const n = Math.min(7, Math.round(timesPerWeek));
      for (let i = 0; i < n; i++) slots.push(toSlot(addDays(weekStart, Math.floor((i * 7) / n))));
    } else if (timesPerWeek && timesPerWeek > 0) {
      const interval = Math.round(1 / timesPerWeek);
      if (isoWeek(weekStart) % interval === hash(def.id) % interval) {
        slots.push(toSlot(addDays(weekStart, LOW_FREQ_DAY)));
      }
    }
  }
  return slots;
}

export function distributeWeek(
  slots: Slot[],
  adults: string[],
  children: string[],
  lastAssignee: Record<string, string>,
): Occurrence[] {
  const occurrences: Occurrence[] = [];
  if (adults.length === 0) return occurrences;
  const load: Record<string, number> = {};
  for (const a of adults) load[a] = 0;
  const childLoad: Record<string, number> = {};
  for (const c of children) childLoad[c] = 0;

  const toOcc = (slot: Slot, assignee: string, idx: number): Occurrence => ({
    id: `${slot.date}-${slot.defId}-${idx}`,
    defId: slot.defId,
    title: slot.title,
    zone: slot.zone,
    weight: slot.weight,
    date: slot.date,
    assignee,
    status: 'todo',
  });

  // Tri déterministe : poids décroissant puis identifiant/date
  const sorted = [...slots].sort(
    (a, b) => b.weight - a.weight || a.defId.localeCompare(b.defId) || a.date.localeCompare(b.date),
  );

  /** Personne la moins chargée ; à égalité, rotation (éviter celui qui l'a fait la dernière fois) */
  const pickLeast = (candidates: string[], loadMap: Record<string, number>, defId: string): string => {
    const min = Math.min(...candidates.map((c) => loadMap[c]));
    const tied = candidates.filter((c) => loadMap[c] === min);
    if (tied.length === 1) return tied[0];
    const last = lastAssignee[defId];
    return tied.find((c) => c !== last) ?? tied[0];
  };

  let idx = 0;
  for (const slot of sorted) {
    idx++;
    if (slot.childTask) {
      if (children.length === 0) continue;
      const pick = pickLeast(children, childLoad, slot.defId);
      occurrences.push(toOcc(slot, pick, idx));
      childLoad[pick] += slot.weight;
      continue;
    }
    if (slot.fixedAssignee) {
      occurrences.push(toOcc(slot, slot.fixedAssignee, idx));
      if (slot.fixedAssignee in load) load[slot.fixedAssignee] += slot.weight;
      continue;
    }
    const pick = pickLeast(adults, load, slot.defId);
    occurrences.push(toOcc(slot, pick, idx));
    load[pick] += slot.weight;
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || b.weight - a.weight);
}
