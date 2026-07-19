export const TZ = 'Indian/Reunion';
export const TZ_OFFSET_HOURS = 4;

/** Zones visibles dans la scène du village (la clairière accueille les loisirs) */
export const SCENE_ZONES = ['jardin', 'piscine', 'lessive', 'cuisine', 'courses', 'rangement', 'loisirs'] as const;
export type Zone = (typeof SCENE_ZONES)[number];

/** Catégorie de tâche : les intégrées portent l'id de leur zone ; les personnalisées pointent vers une zone de la scène */
export interface Category {
  id: string;
  label: string;
  emoji: string;
  zone: Zone;
  builtin: boolean;
}

export const AISLES = [
  'fruits & légumes',
  'frais',
  'épicerie',
  'boissons',
  'hygiène',
  'maison',
  'autre',
] as const;
export type Aisle = (typeof AISLES)[number];

export type Season = 'all' | 'summer' | 'winter';

/** Jours : 0 = lundi ... 6 = dimanche */
export interface Recurrence {
  timesPerWeek?: number;
  daysOfWeek?: number[];
}

export interface Member {
  id: string;
  name: string;
  creature: string;
  role: 'adult' | 'child';
  color: string;
  notifPrefs: { morning: boolean; evening: boolean };
}

export interface TaskDef {
  id: string;
  title: string;
  /** id de catégorie */
  zone: string;
  weight: number;
  recurrence: Recurrence;
  fixedAssignee?: string | null;
  childTask: boolean;
  reminderTime?: string | null;
  season: Season;
  active: boolean;
}

/** Une occurrence à planifier (issue de l'expansion d'une définition) */
export interface Slot {
  defId: string;
  title: string;
  zone: string;
  weight: number;
  date: string; // YYYY-MM-DD
  fixedAssignee?: string | null;
  childTask: boolean;
}

export interface Occurrence {
  id: string;
  defId: string | null;
  title: string;
  /** id de catégorie */
  zone: string;
  weight: number;
  date: string; // YYYY-MM-DD
  assignee: string;
  status: 'todo' | 'done' | 'skipped';
  doneAt?: string | null;
  doneBy?: string | null;
  validatedBy?: string | null;
  manual?: boolean;
  /** Lie les occurrences d'une même tâche partagée (une par participant) */
  groupId?: string | null;
}

export interface MemberProgress {
  memberId: string;
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  milestones: string[];
}

export interface ShoppingItem {
  id: string;
  label: string;
  aisle: Aisle;
  status: 'open' | 'checked';
  qty: number;
  addedBy: string;
  addedAt: string;
}

export interface Purchase {
  label: string;
  purchasedAt: string; // ISO
}
