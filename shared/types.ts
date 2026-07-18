export const TZ = 'Indian/Reunion';
export const TZ_OFFSET_HOURS = 4;

export const ZONES = ['jardin', 'piscine', 'lessive', 'cuisine', 'courses', 'rangement'] as const;
export type Zone = (typeof ZONES)[number];

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
  zone: Zone;
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
  zone: Zone;
  weight: number;
  date: string; // YYYY-MM-DD
  fixedAssignee?: string | null;
  childTask: boolean;
}

export interface Occurrence {
  id: string;
  defId: string | null;
  title: string;
  zone: Zone;
  weight: number;
  date: string; // YYYY-MM-DD
  assignee: string;
  status: 'todo' | 'done' | 'skipped';
  doneAt?: string | null;
  doneBy?: string | null;
  validatedBy?: string | null;
  manual?: boolean;
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
  addedBy: string;
  addedAt: string;
}

export interface Purchase {
  label: string;
  purchasedAt: string; // ISO
}
