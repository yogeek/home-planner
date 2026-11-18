import type { Category, Moment, Zone } from './types';

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

export const AISLE_ORDER = [
  'fruits & légumes',
  'boulangerie',
  'frais',
  'surgelés',
  'épicerie',
  'boissons',
  'bébé',
  'hygiène',
  'maison',
  'animaux',
  'autre',
] as const;

export const AISLE_EMOJI: Record<string, string> = {
  'fruits & légumes': '🍎',
  boulangerie: '🥖',
  frais: '🧀',
  surgelés: '🧊',
  épicerie: '🥫',
  boissons: '🧃',
  bébé: '🍼',
  hygiène: '🧴',
  maison: '🏠',
  animaux: '🐾',
  autre: '🛒',
};

export const MOMENT_META: Record<Moment, { label: string; emoji: string }> = {
  matin: { label: 'matin', emoji: '🌅' },
  midi: { label: 'midi', emoji: '🌞' },
  soir: { label: 'soir', emoji: '🌙' },
};

/** Ordre d'affichage dans la journée (sans moment : entre midi et le soir) */
export function momentRank(m: Moment | null | undefined): number {
  return m === 'matin' ? 0 : m === 'midi' ? 1 : m === 'soir' ? 3 : 2;
}

const DAY_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric' });

/** « lundi 16 » */
export function shortDay(date: string): string {
  return DAY_FMT.format(new Date(date + 'T12:00:00'));
}

/** Couleurs bien distinctes pour les barres de contribution (deux créatures orange restent lisibles) */
export const MEMBER_PALETTE = ['#d9714e', '#5b8fb9', '#8b6fae', '#6e9075', '#e0a33a', '#c25b7a', '#4f7d74', '#9c7b52'];

export const ROLE_META: Record<'adult' | 'teen' | 'child', { label: string; desc: string }> = {
  adult: { label: 'Adulte', desc: 'Toutes les tâches, en rotation' },
  teen: { label: '🎧 Ado', desc: 'Tâches légères en rotation, part réduite' },
  child: { label: '🧸 Enfant', desc: 'Missions enfant illustrées' },
};
