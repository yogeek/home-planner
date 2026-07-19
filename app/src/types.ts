import type {
  Category,
  Member,
  MemberProgress,
  Occurrence,
  ShoppingItem,
  TaskDef,
  Zone,
} from '@shared/types';
import type { LevelInfo } from '@shared/village';

export type { Category, Member, MemberProgress, Occurrence, ShoppingItem, TaskDef, Zone };
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
  /** Glands récoltés cette semaine par membre (id → glands) */
  weekGlands: Record<string, number>;
  monthTotals: Record<string, { total: number; count: number }>;
  taskDefs: TaskDef[];
  categories: Category[];
}
