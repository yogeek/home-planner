import type {
  Category,
  Moment,
  Role,
  Member,
  MemberProgress,
  Occurrence,
  ShoppingItem,
  TaskDef,
  Zone,
} from '@shared/types';
import type { LevelInfo } from '@shared/village';

export type { Category, Member, MemberProgress, Moment, Occurrence, Role, ShoppingItem, TaskDef, Zone };
export type { LevelInfo };

export interface AppState {
  now: string;
  today: string;
  weekStart: string;
  vapidPublic: string | null;
  onboarded: boolean;
  members: Member[];
  village: {
    acorns: number;
    levelInfo: LevelInfo;
    freshness: Record<Zone, number>;
  };
  week: Occurrence[];
  shopping: ShoppingItem[];
  suggestions: string[];
  frequent: string[];
  progress: MemberProgress[];
  /** Noisettes récoltées cette semaine par membre (id → noisettes) */
  weekGlands: Record<string, number>;
  monthTotals: Record<string, { total: number; count: number }>;
  taskDefs: TaskDef[];
  categories: Category[];
  /** Missions non faites des 7 derniers jours */
  overdue: Occurrence[];
  /** Semaine prochaine (préparée le dimanche soir) */
  nextWeek: Occurrence[];
  lastWeek: { total: number; missions: number; perMember: Record<string, number>; weekStart: string };
  settings: {
    weeklyGoal: number | null;
    goalReward: string | null;
    pauseFrom: string | null;
    pauseUntil: string | null;
    paused: boolean;
    hasPin: boolean;
  };
  thanks: Thanks[];
  swaps: Swap[];
  rewards: Reward[];
  claims: Claim[];
  /** Noisettes gagnées depuis toujours et dépensées en récompenses, par membre */
  stars: Record<string, { earned: number; spent: number }>;
}

export interface Thanks {
  occurrenceId: string;
  from: string;
  at: string;
}

export interface Swap {
  id: string;
  fromOcc: string;
  toOcc: string;
  fromMember: string;
  toMember: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  title: string;
  emoji: string;
  cost: number;
}

export interface Claim {
  id: string;
  memberId: string;
  title: string;
  emoji: string;
  cost: number;
  claimedAt: string;
}
