import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { ZONE_META, catInfo } from '../zones';
import { SCENE_ZONES } from '@shared/types';
import type { AppState, Category, TaskDef } from '../types';
import { useEscape } from '../useEscape';
import './tasksettings.css';

const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function recurrenceLabel(def: TaskDef): string {
  const r = def.recurrence;
  if (r.daysOfWeek?.length) return r.daysOfWeek.map((d) => DAY_SHORT[d]).join(', ');
  if (!r.timesPerWeek) return 'jamais';
  if (r.timesPerWeek >= 1) return `${Math.round(r.timesPerWeek)}×/semaine`;
  if (r.timesPerWeek >= 0.5) return 'toutes les 2 semaines';
  return '1×/mois';
}

/** Réglages des tâches récurrentes et des catégories du foyer */
export function TaskSettings({ onClose }: { onClose: () => void }) {
  const state = useStore((s) => s.state);
  const [editing, setEditing] = useState<TaskDef | 'new' | null>(null);
  const [editingCat, setEditingCat] = useState<Category | 'new' | null>(null);
  if (!state) return null;

  const defs = [...state.taskDefs].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.zone.localeCompare(b.zone) || a.title.localeCompare(b.title),
  );

  return (
    <div className="tset-backdrop">
      <div className="tset">
        <header className="tset-head">
          <h2>🛠️ Les tâches du foyer</h2>
          <button className="btn secondary tset-back" onClick={onClose}>
            ✕ Fermer
          </button>
        </header>
        <p className="muted tset-hint">
          Ces tâches nourrissent la répartition automatique de chaque semaine. Touche une tâche pour la modifier, le
          changement s'appliquera à la prochaine répartition (ou via « ⚖️ Rééquilibrer » dans Semaine).
        </p>
        <div className="tset-list">
          {defs.map((d) => (
            <button key={d.id} className={`tset-item ${d.active ? '' : 'inactive'}`} onClick={() => setEditing(d)}>
              <span className="tset-zone" aria-hidden>{catInfo(state.categories, d.zone).emoji}</span>
              <span className="tset-body">
                <span className="tset-title">{d.title}</span>
                <span className="tset-meta">
                  {catInfo(state.categories, d.zone).label} · {recurrenceLabel(d)} · {'🌰'.repeat(d.weight)}
                  {d.childTask ? ' · enfant 🧸' : ''}
                  {d.season !== 'all' ? (d.season === 'summer' ? ' · été' : ' · hiver') : ''}
                  {!d.active ? ' · en pause' : ''}
                </span>
              </span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>
        <button className="btn tset-add" onClick={() => setEditing('new')}>
          + Nouvelle tâche récurrente
        </button>

        <header className="tset-head tset-cats-head">
          <h2>🏷️ Les catégories</h2>
        </header>
        <p className="muted tset-hint">
          Chaque catégorie vit dans une zone du village. Crée les tiennes (sport, sorties, admin...) : par défaut elles
          s'installent à la clairière 🎈.
        </p>
        <div className="tset-list">
          {state.categories.map((c) => (
            <button key={c.id} className="tset-item" onClick={() => setEditingCat(c)}>
              <span className="tset-zone" aria-hidden>{c.emoji}</span>
              <span className="tset-body">
                <span className="tset-title">{c.label}</span>
                <span className="tset-meta">
                  {ZONE_META[c.zone].place}
                  {c.builtin ? ' · catégorie du village' : ''}
                </span>
              </span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>
        <button className="btn tset-add" onClick={() => setEditingCat('new')}>
          + Nouvelle catégorie
        </button>
      </div>
      {editing && <EditSheet def={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {editingCat && <CategorySheet cat={editingCat === 'new' ? null : editingCat} onClose={() => setEditingCat(null)} />}
    </div>
  );
}

function EditSheet({ def, onClose }: { def: TaskDef | null; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const applyState = useStore((s) => s.applyState);
  const [title, setTitle] = useState(def?.title ?? '');
  const [zone, setZone] = useState(def?.zone ?? 'rangement');
  const [weight, setWeight] = useState(def?.weight ?? 2);
  const [mode, setMode] = useState<'freq' | 'days'>(def?.recurrence.daysOfWeek?.length ? 'days' : 'freq');
  const [freq, setFreq] = useState(def?.recurrence.timesPerWeek ?? 1);
  const [days, setDays] = useState<number[]>(def?.recurrence.daysOfWeek ?? []);
  const [childTask, setChildTask] = useState(def?.childTask ?? false);
  const [fixedAssignee, setFixedAssignee] = useState(def?.fixedAssignee ?? '');
  const [season, setSeason] = useState(def?.season ?? 'all');
  const [active, setActive] = useState(def?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!state) return null;
  const adults = state.members.filter((m) => m.role === 'adult');

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    const body = {
      title: title.trim(),
      zone,
      weight,
      recurrence: mode === 'days' && days.length > 0 ? { daysOfWeek: [...days].sort() } : { timesPerWeek: freq },
      childTask,
      fixedAssignee: childTask ? null : fixedAssignee || null,
      season,
      active,
    };
    try {
      const s = def ? await api<AppState>(`/tasks/${def.id}`, { method: 'PUT', body }) : await api<AppState>('/tasks', { body });
      applyState(s);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!def || busy) return;
    setBusy(true);
    try {
      const s = await api<AppState>(`/tasks/${def.id}`, { method: 'DELETE', body: {} });
      applyState(s);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tset-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{def ? 'Modifier la tâche' : 'Nouvelle tâche récurrente'}</h3>

        <input className="ob-input" placeholder="Nom de la tâche" value={title} onChange={(e) => setTitle(e.target.value)} />

        <p className="muted">Catégorie :</p>
        <div className="move-row wrap">
          {state.categories.map((c) => (
            <button key={c.id} className={`move-chip ${zone === c.id ? 'active' : ''}`} onClick={() => setZone(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <p className="muted">Pénibilité (glands gagnés) :</p>
        <div className="move-row">
          {[1, 2, 3, 4, 5].map((w) => (
            <button key={w} className={`move-chip ${weight === w ? 'active' : ''}`} onClick={() => setWeight(w)}>
              {w} 🌰
            </button>
          ))}
        </div>

        <p className="muted">Rythme :</p>
        <div className="move-row">
          <button className={`move-chip ${mode === 'freq' ? 'active' : ''}`} onClick={() => setMode('freq')}>
            Fréquence
          </button>
          <button className={`move-chip ${mode === 'days' ? 'active' : ''}`} onClick={() => setMode('days')}>
            Jours fixes
          </button>
        </div>
        {mode === 'freq' ? (
          <div className="move-row wrap">
            {[
              { v: 0.25, label: '1×/mois' },
              { v: 0.5, label: 'ttes les 2 sem.' },
              { v: 1, label: '1×/sem' },
              { v: 2, label: '2×' },
              { v: 3, label: '3×' },
              { v: 5, label: '5×' },
              { v: 7, label: 'tous les jours' },
            ].map((o) => (
              <button key={o.v} className={`move-chip ${freq === o.v ? 'active' : ''}`} onClick={() => setFreq(o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="move-row wrap">
            {DAY_SHORT.map((d, i) => (
              <button
                key={d}
                className={`move-chip day ${days.includes(i) ? 'active' : ''}`}
                onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <p className="muted">Qui :</p>
        <div className="move-row wrap">
          <button className={`move-chip ${!childTask && !fixedAssignee ? 'active' : ''}`} onClick={() => { setChildTask(false); setFixedAssignee(''); }}>
            🔄 En rotation
          </button>
          {adults.map((a) => (
            <button
              key={a.id}
              className={`move-chip ${fixedAssignee === a.id ? 'active' : ''}`}
              onClick={() => { setChildTask(false); setFixedAssignee(a.id); }}
            >
              Toujours {a.name}
            </button>
          ))}
          <button className={`move-chip ${childTask ? 'active' : ''}`} onClick={() => { setChildTask(true); setFixedAssignee(''); }}>
            🧸 Mission enfant
          </button>
        </div>

        <p className="muted">Saison :</p>
        <div className="move-row">
          {([['all', 'Toute l\'année'], ['summer', 'Été'], ['winter', 'Hiver']] as const).map(([v, label]) => (
            <button key={v} className={`move-chip ${season === v ? 'active' : ''}`} onClick={() => setSeason(v)}>
              {label}
            </button>
          ))}
        </div>

        {def && (
          <label className="tset-active">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Tâche active (décoche pour la mettre en pause sans la supprimer)
          </label>
        )}

        <button className="btn sheet-close" disabled={!title.trim() || busy} onClick={() => void save()}>
          {busy ? '...' : def ? 'Enregistrer' : 'Créer la tâche'}
        </button>
        {def && (
          <button
            className="btn ghost sheet-close tset-delete"
            disabled={busy}
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            🗑️ {confirmDelete ? 'Confirmer : supprimer définitivement' : 'Supprimer cette tâche'}
          </button>
        )}
      </div>
    </div>
  );
}

function CategorySheet({ cat, onClose }: { cat: Category | null; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const applyState = useStore((s) => s.applyState);
  const [label, setLabel] = useState(cat?.label ?? '');
  const [emoji, setEmoji] = useState(cat?.emoji ?? '');
  const [zone, setZone] = useState(cat?.zone ?? 'loisirs');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!state) return null;

  // Palette large : on clique plutôt que de taper (animaux, sport, loisirs, maison, admin...)
  const suggestions = [
    '🏃', '⚽', '🏀', '🚴', '🏊', '🧘', '🎾', '⛳',
    '🎉', '🎨', '🎮', '🎸', '🎭', '📷', '🍿', '✈️',
    '🐶', '🐱', '🐰', '🐟', '🐴', '🌱', '🪴', '🐝',
    '📄', '📚', '💼', '💳', '📅', '🔧', '🚗', '🏠',
  ];

  async function save() {
    if (!label.trim() || busy) return;
    setBusy(true);
    const body = { label: label.trim(), emoji: emoji.trim() || '⭐', zone };
    try {
      const s = cat
        ? await api<AppState>(`/categories/${cat.id}`, { method: 'PUT', body })
        : await api<AppState>('/categories', { body });
      applyState(s);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!cat || busy) return;
    setBusy(true);
    try {
      const s = await api<AppState>(`/categories/${cat.id}`, { method: 'DELETE', body: {} });
      applyState(s);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tset-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{cat ? `Catégorie ${cat.label}` : 'Nouvelle catégorie'}</h3>

        <input
          className="ob-input"
          placeholder="Nom (ex : Sport, Sorties, Administratif...)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <p className="muted">Emoji : {emoji && <span className="tset-emoji-preview">{emoji}</span>}</p>
        <div className="tset-emoji-grid">
          {suggestions.map((s) => (
            <button
              key={s}
              className={`tset-emoji-btn ${emoji === s ? 'active' : ''}`}
              onClick={() => setEmoji(s)}
              aria-label={`emoji ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          className="ob-input tset-emoji-input"
          placeholder="ou tape le tien : ⭐"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
        />

        {!cat?.builtin && (
          <>
            <p className="muted">Où vit cette catégorie dans le village ?</p>
            <div className="move-row wrap">
              {SCENE_ZONES.map((z) => (
                <button key={z} className={`move-chip ${zone === z ? 'active' : ''}`} onClick={() => setZone(z)}>
                  {ZONE_META[z].emoji} {ZONE_META[z].place}
                </button>
              ))}
            </div>
          </>
        )}

        <button className="btn sheet-close" disabled={!label.trim() || busy} onClick={() => void save()}>
          {busy ? '...' : cat ? 'Enregistrer' : 'Créer la catégorie'}
        </button>
        {cat && !cat.builtin && (
          <button
            className="btn ghost sheet-close tset-delete"
            disabled={busy}
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            🗑️ {confirmDelete ? 'Confirmer (les tâches iront aux loisirs)' : 'Supprimer cette catégorie'}
          </button>
        )}
      </div>
    </div>
  );
}
