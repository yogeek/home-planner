import type { Category, Zone } from './types';

export const ZONE_META: Record<Zone, { label: string; place: string; emoji: string }> = {
  jardin: { label: 'Jardin', place: 'Le potager', emoji: '🌿' },
  piscine: { label: 'Piscine', place: 'La source', emoji: '💧' },
  lessive: { label: 'Lessive', place: 'Le lavoir', emoji: '🧺' },
  cuisine: { label: 'Cuisine', place: 'La grande table', emoji: '🍲' },
  courses: { label: 'Courses', place: 'Le marché', emoji: '🧡' },
  rangement: { label: 'Rangement', place: "L'atelier", emoji: '🧹' },
  loisirs: { label: 'Loisirs', place: 'La clairière', emoji: '🎈' },
};

/** Infos d'affichage d'une catégorie (id de catégorie porté par occ.zone / def.zone) */
export function catInfo(
  categories: Category[] | undefined,
  id: string,
): { label: string; emoji: string; sceneZone: Zone; place: string } {
  const cat = categories?.find((c) => c.id === id);
  if (cat) {
    return {
      label: cat.label,
      emoji: cat.emoji,
      sceneZone: cat.zone,
      place: cat.builtin ? ZONE_META[cat.zone].place : cat.label,
    };
  }
  const meta = ZONE_META[id as Zone];
  if (meta) return { label: meta.label, emoji: meta.emoji, sceneZone: id as Zone, place: meta.place };
  return { label: id, emoji: '⭐', sceneZone: 'loisirs', place: id };
}

export const AISLE_ORDER = ['fruits & légumes', 'frais', 'épicerie', 'boissons', 'hygiène', 'maison', 'autre'] as const;

export const AISLE_EMOJI: Record<string, string> = {
  'fruits & légumes': '🍎',
  frais: '🧀',
  épicerie: '🥫',
  boissons: '🧃',
  hygiène: '🧴',
  maison: '🏠',
  autre: '🛒',
};
