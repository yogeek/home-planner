import { create } from 'zustand';
import { api, getMemberId, setMemberId } from './api';
import { enqueue, flushQueue, loadCache, saveCache } from './offline';
import { catInfo } from './zones';
import { guessAisle } from '@shared/aisles';
import type { AppState, Occurrence, ShoppingItem, Zone } from './types';

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
  /** Mode tableau du foyer (tablette murale), mémorisé sur l'appareil */
  dashboard: boolean;
  setDashboard: (v: boolean) => void;
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
  addOccurrence: (data: { title: string; zone: string; weight?: number; date?: string; assignee?: string; assignees?: string[] }) => Promise<void>;
  editOccurrence: (occ: Occurrence, changes: { title?: string; zone?: string; weight?: number }) => Promise<void>;
  deleteOccurrence: (occ: Occurrence) => Promise<void>;

  addShoppingItem: (label: string, aisle?: string) => Promise<void>;
  toggleShoppingItem: (item: ShoppingItem) => Promise<void>;
  removeShoppingItem: (item: ShoppingItem) => Promise<void>;
  updateShoppingItem: (item: ShoppingItem, changes: { aisle?: string; qty?: number }) => Promise<void>;
  checkoutShopping: () => Promise<void>;

  info: string | null;
  notifyInfo: (msg: string) => void;
  clearError: () => void;
}

/** Mutation avec repli hors ligne : applique localement, tente le réseau, sinon met en file */
async function shoppingMutation(
  get: () => Store,
  set: (partial: Partial<Store>) => void,
  localPatch: (items: ShoppingItem[]) => ShoppingItem[],
  path: string,
  body: Record<string, unknown>,
  method?: string,
): Promise<void> {
  const { state } = get();
  if (state) {
    set({ state: { ...state, shopping: localPatch(state.shopping) } });
  }
  try {
    const s = await api(path, { body, method });
    set({ state: s });
    saveCache(s);
  } catch (e) {
    const status = e instanceof Error && 'status' in e ? (e as { status: number }).status : 0;
    if (status >= 400 && status < 500) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
      void get().refresh();
    } else {
      // Hors ligne : on garde le changement local et on met en file
      enqueue({ path, body, method });
    }
  }
}

export const useStore = create<Store>((set, get) => ({
  state: null,
  memberId: getMemberId(),
  tab: 'village',
  childMode: false,
  dashboard: localStorage.getItem('village.dashboard') === '1',
  loading: false,
  error: null,
  celebration: null,

  setDashboard: (v) => {
    localStorage.setItem('village.dashboard', v ? '1' : '0');
    set({ dashboard: v });
  },

  setTab: (tab) => set({ tab }),
  setChildMode: (childMode) => set({ childMode }),

  chooseMember: (id) => {
    setMemberId(id);
    set({ memberId: id });
  },

  applyState: (s) => {
    set({ state: s });
    saveCache(s);
  },

  refresh: async () => {
    try {
      set({ loading: get().state === null });
      await flushQueue();
      const s = await api('/state');
      set({ state: s, loading: false });
      saveCache(s);
    } catch (e) {
      // Hors ligne : on repart du dernier état connu
      const cached = get().state ?? loadCache<AppState>();
      set({
        loading: false,
        state: cached,
        error: cached ? null : e instanceof Error ? e.message : 'Erreur',
      });
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
        zone: catInfo(state.categories, occ.zone).sceneZone,
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

  editOccurrence: async (occ, changes) => {
    try {
      const s = await api(`/occurrences/${occ.id}`, { method: 'PUT', body: changes });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
    }
  },

  deleteOccurrence: async (occ) => {
    const { state } = get();
    if (state) {
      set({ state: { ...state, week: state.week.filter((o) => o.id !== occ.id) } });
    }
    try {
      const s = await api(`/occurrences/${occ.id}`, { method: 'DELETE', body: {} });
      set({ state: s });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Erreur' });
      void get().refresh();
    }
  },

  addShoppingItem: async (label, aisle) => {
    const existing = get().state?.shopping.find((i) => i.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      get().notifyInfo(`${existing.label} ×${existing.qty + 1} 🧺`);
      await shoppingMutation(
        get,
        set,
        (items) => items.map((i) => (i.id === existing.id ? { ...i, qty: i.qty + 1, status: 'open' as const } : i)),
        '/shopping',
        { label, byMemberId: get().memberId },
      );
      return;
    }
    const temp: ShoppingItem = {
      id: `local-${Date.now()}`,
      label,
      // Rayon deviné localement : affichage instantané, et correct même hors ligne
      aisle: (aisle as ShoppingItem['aisle']) ?? guessAisle(label),
      status: 'open',
      qty: 1,
      addedBy: get().memberId ?? '',
      addedAt: new Date().toISOString(),
    };
    await shoppingMutation(get, set, (items) => [...items, temp], '/shopping', {
      label,
      aisle,
      byMemberId: get().memberId,
    });
  },

  updateShoppingItem: async (item, changes) => {
    if (item.id.startsWith('local-')) return;
    await shoppingMutation(
      get,
      set,
      (items) => items.map((i) => (i.id === item.id ? { ...i, ...changes } as ShoppingItem : i)),
      `/shopping/${item.id}`,
      changes,
      'PUT',
    );
  },

  toggleShoppingItem: async (item) => {
    const action = item.status === 'open' ? 'check' : 'uncheck';
    if (item.id.startsWith('local-')) {
      // article ajouté hors ligne : bascule locale uniquement, le vrai id viendra du refresh
      const { state } = get();
      if (state) {
        set({
          state: {
            ...state,
            shopping: state.shopping.map((i) =>
              i.id === item.id ? { ...i, status: action === 'check' ? 'checked' : 'open' } : i,
            ),
          },
        });
      }
      return;
    }
    await shoppingMutation(
      get,
      set,
      (items) => items.map((i) => (i.id === item.id ? { ...i, status: action === 'check' ? 'checked' : 'open' } : i)),
      `/shopping/${item.id}/${action}`,
      {},
    );
  },

  removeShoppingItem: async (item) => {
    if (item.id.startsWith('local-')) {
      const { state } = get();
      if (state) set({ state: { ...state, shopping: state.shopping.filter((i) => i.id !== item.id) } });
      return;
    }
    await shoppingMutation(get, set, (items) => items.filter((i) => i.id !== item.id), `/shopping/${item.id}/remove`, {});
  },

  checkoutShopping: async () => {
    await shoppingMutation(get, set, (items) => items.filter((i) => i.status !== 'checked'), '/shopping/checkout', {});
  },

  info: null,
  notifyInfo: (msg) => {
    set({ info: msg });
    setTimeout(() => {
      if (useStore.getState().info === msg) set({ info: null });
    }, 2600);
  },

  clearError: () => set({ error: null }),
}));

// Rejoue la file hors ligne dès que le réseau revient
window.addEventListener('online', () => {
  void useStore.getState().refresh();
});

/** Le membre courant */
export function useMe() {
  return useStore((s) => s.state?.members.find((m) => m.id === s.memberId) ?? null);
}
