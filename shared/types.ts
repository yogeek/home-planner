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
  'boulangerie',
  'surgelés',
  'animaux',
  'bébé',
  'autre',
] as const;
export type Aisle = (typeof AISLES)[number];

export type Season = 'all' | 'summer' | 'winter';

/** Jours : 0 = lundi ... 6 = dimanche */
export interface Recurrence {
  timesPerWeek?: number;
  daysOfWeek?: number[];
}

/** adult : tâches en rotation ; teen : tâches légères en rotation (part réduite) ; child : missions enfant */
export type Role = 'adult' | 'teen' | 'child';

/** Moment de la journée d'une tâche (null = n'importe quand) */
export type Moment = 'matin' | 'midi' | 'soir';
export const MOMENTS: Moment[] = ['matin', 'midi', 'soir'];

export interface Member {
  id: string;
  name: string;
  creature: string;
  role: Role;
  color: string;
  notifPrefs: { morning: boolean; evening: boolean };
  /** Absent(e) jusqu'à cette date incluse (YYYY-MM-DD) : ne reçoit plus de tâches */
  awayUntil?: string | null;
  /** Jours chargés (0 = lundi) : pas de tâche en rotation ces jours-là */
  busyDays?: number[];
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
  moment?: Moment | null;
  /** Tâche « au premier qui la prend » : pas d'assigné à la génération */
  pool?: boolean;
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
  moment?: Moment | null;
  pool?: boolean;
}

export interface Occurrence {
  id: string;
  defId: string | null;
  title: string;
  /** id de catégorie */
  zone: string;
  weight: number;
  date: string; // YYYY-MM-DD
  /** null = à prendre par n'importe qui */
  assignee: string | null;
  status: 'todo' | 'done' | 'skipped';
  doneAt?: string | null;
  doneBy?: string | null;
  validatedBy?: string | null;
  manual?: boolean;
  /** Lie les occurrences d'une même tâche partagée (une par participant) */
  groupId?: string | null;
  moment?: Moment | null;
  /** Qui a confié cette tâche à l'assigné (« confiée par Papa ») */
  handedBy?: string | null;
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
