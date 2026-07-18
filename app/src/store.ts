import { create } from 'zustand';
import { api, getMemberId, setMemberId } from './api';
import type { AppState, Occurrence, Zone } from './types';

export type TabId = 'village' | 'jour' | 'semaine' | 'courses' | 'plus';

export interface Celebration {
  zone: Zone;
  weight: number;
  title: string;
  levelBefore: number;
  ts: number;
}

interface Store {
  state: AppState | null;
  memberId: string | null;
  tab: TabId;
  childMode: boolean;
  loading: boolean;
  error: string | null;
  celebration: Celebration | null;

  setTab: (t: TabId) => void;
  setChildMode: (v: boolean) => void;
  chooseMember: (id: string) => void;
  refresh: () => Promise<void>;
  applyState: (s: AppState) => void;

  doneOccurrence: (occ: Occurrence, validatedBy?: string) => Promise<void>;
  undoOccurrence: (occ: Occurrence) => Promise<void>;
  moveOccurrence: (occ: Occurrence, changes: { date?: string; assignee?: string }) => Promise<void>;
  addOccurrence: (data: { title: string; zone: Zone; weight?: number; date?: string; assignee?: string }) => Promise<void>;
  clearError: () => void;
}

export const useStore = create<Store>((set, get) => ({
  state: null,
  memberId: getMemberId(),
  tab: 'village',
  childMode: false,
  loading: false,
  error: null,
  celebration: null,

  setTab: (tab) => set({ tab }),
  setChildMode: (childMode) => set({ childMode }),

  chooseMember: (id) => {
    setMemberId(id);
    set({ memberId: id });
  },

  applyState: (s) => set({ state: s }),

  refresh: async () => {
    try {
      set({ loading: get().state === null });
      const s = await api('/state');
      set({ state: s, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Erreur' });
    }
  },

  doneOccurrence: async (occ, validatedBy) => {
    const { state, memberId } = get();
    if (!state) return;
    // Optimiste : marque fait localement + célébration immédiate
    set({
      state: {
        ...state,
        week: state.week.map((o) => (o.id === occ.id ? { ...o, status: 'done' as const, doneBy: memberId } : o)),
      },
      celebration: {
        zone: occ.zone,
        weight: occ.weight,
        title: occ.title,
        levelBefore: state.village.levelInfo.level,
        ts: Date.now(),
      },
    });
    try {
      const s = await api(`/occurrences/${occ.id}/done`, { body: { byMemberId: memberId, validatedBy } });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
      void get().refresh();
    }
  },

  undoOccurrence: async (occ) => {
    try {
      const s = await api(`/occurrences/${occ.id}/undo`, { body: {} });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
    }
  },

  moveOccurrence: async (occ, changes) => {
    const { state } = get();
    if (state) {
      set({
        state: { ...state, week: state.week.map((o) => (o.id === occ.id ? { ...o, ...changes } : o)) },
      });
    }
    try {
      const s = await api(`/occurrences/${occ.id}/move`, { body: changes });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
      void get().refresh();
    }
  },

  addOccurrence: async (data) => {
    try {
      const s = await api('/occurrences', { body: { ...data, byMemberId: get().memberId } });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
    }
  },

  clearError: () => set({ error: null }),
}));

/** Le membre courant */
export function useMe() {
  return useStore((s) => s.state?.members.find((m) => m.id === s.memberId) ?? null);
}
