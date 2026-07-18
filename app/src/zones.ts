import type { Zone } from './types';

export const ZONE_META: Record<Zone, { label: string; place: string; emoji: string }> = {
  jardin: { label: 'Jardin', place: 'Le potager', emoji: '🌿' },
  piscine: { label: 'Piscine', place: 'La source', emoji: '💧' },
  lessive: { label: 'Lessive', place: 'Le lavoir', emoji: '🧺' },
  cuisine: { label: 'Cuisine', place: 'La grande table', emoji: '🍲' },
  courses: { label: 'Courses', place: 'Le marché', emoji: '🧡' },
  rangement: { label: 'Rangement', place: "L'atelier", emoji: '🧹' },
};

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
