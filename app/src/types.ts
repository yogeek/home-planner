import type {
  Category,
  Member,
  MemberProgress,
  Occurrence,
  ShoppingItem,
  TaskDef,
  Zone,
} from '@shared/types';
import type { LevelInfo, Balance } from '@shared/village';

export type { Category, Member, MemberProgress, Occurrence, ShoppingItem, TaskDef, Zone };
export type { LevelInfo, Balance };

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
  balance: Balance | null;
  monthTotals: Record<string, { total: number; count: number }>;
  taskDefs: TaskDef[];
  categories: Category[];
}
