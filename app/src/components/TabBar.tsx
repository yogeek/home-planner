import { useStore, type TabId } from '../store';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'village', label: 'Village', icon: '🏡' },
  { id: 'jour', label: "Aujourd'hui", icon: '☀️' },
  { id: 'semaine', label: 'Semaine', icon: '🗓️' },
  { id: 'courses', label: 'Courses', icon: '🧺' },
  { id: 'plus', label: 'Plus', icon: '🌙' },
];

export function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const state = useStore((s) => s.state);
  const memberId = useStore((s) => s.memberId);

  const todayCount =
    state?.week.filter((o) => o.date === state.today && o.assignee === memberId && o.status === 'todo').length ?? 0;
  const shoppingCount = state?.shopping.filter((i) => i.status === 'open').length ?? 0;

  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab ${tab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <span className="tab-icon" aria-hidden>
            {t.icon}
          </span>
          {t.label}
          {t.id === 'jour' && todayCount > 0 && <span className="badge">{todayCount}</span>}
          {t.id === 'courses' && shoppingCount > 0 && <span className="badge">{shoppingCount}</span>}
        </button>
      ))}
    </nav>
  );
}
