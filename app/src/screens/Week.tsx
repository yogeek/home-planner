import { useState } from 'react';
import { useStore } from '../store';
import { Creature } from '../components/Creature';
import { catInfo } from '../zones';
import { addDays } from '@shared/dates';
import { api } from '../api';
import type { Occurrence } from '../types';
import { useEscape } from '../useEscape';
import './week.css';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function Week() {
  const state = useStore((s) => s.state);
  const applyState = useStore((s) => s.applyState);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i));

  async function regenerate() {
    setBusy(true);
    try {
      applyState(await api('/week/regenerate', { body: {} }));
      notifyInfo('Semaine rééquilibrée ⚖️');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen week-screen">
      <div className="title-row">
        <h2>La semaine du village</h2>
        <button className="week-regen" onClick={regenerate} disabled={busy} title="Rééquilibrer la semaine">
          {busy ? '...' : '⚖️ Rééquilibrer'}
        </button>
      </div>

      {/* Qui fait quoi cette semaine : un coup d'œil par personne */}
      <div className="week-team">
        {state.members.map((m) => {
          const mine = state.week.filter((o) => o.assignee === m.id && o.status !== 'skipped');
          const done = mine.filter((o) => o.status === 'done').length;
          return (
            <div key={m.id} className="week-team-person">
              <Creature species={m.creature} size={30} mood={mine.length > 0 && done === mine.length ? 'joy' : 'normal'} />
              <span className="week-team-name">{m.name}</span>
              <span className="week-team-count">
                {done}/{mine.length}
              </span>
            </div>
          );
        })}
      </div>

      {days.map((date, i) => {
        const tasks = state.week.filter((o) => o.date === date && o.status !== 'skipped');
        return (
          <section key={date} className={`week-day ${date === state.today ? 'today' : ''}`}>
            <h3>
              {DAY_NAMES[i]}
              {date === state.today && <span className="week-today-tag">aujourd'hui</span>}
            </h3>
            {tasks.length === 0 && <p className="week-free">Repos 🍃</p>}
            {tasks.map((o) => {
              const member = state.members.find((m) => m.id === o.assignee);
              return (
                <button key={o.id} className={`week-task ${o.status}`} onClick={() => setEditing(o)}>
                  <span className="week-task-zone" aria-hidden>{catInfo(state.categories, o.zone).emoji}</span>
                  <span className="week-task-title">
                    {o.title}
                    {o.groupId && <span className="week-shared" title="Tâche à plusieurs"> 👥</span>}
                  </span>
                  <span className="week-task-weight" aria-label={`${o.weight} glands`}>{'🌰'.repeat(o.weight)}</span>
                  {member && <Creature species={member.creature} size={26} />}
                </button>
              );
            })}
          </section>
        );
      })}

      <button className="btn week-add" onClick={() => setAdding(true)}>
        + Ajouter une tâche
      </button>

      {editing && <MoveSheet occ={editing} onClose={() => setEditing(null)} />}
      {adding && <AddSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function MoveSheet({ occ, onClose }: { occ: Occurrence; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const moveOccurrence = useStore((s) => s.moveOccurrence);
  const undoOccurrence = useStore((s) => s.undoOccurrence);
  const editOccurrence = useStore((s) => s.editOccurrence);
  const deleteOccurrence = useStore((s) => s.deleteOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(occ.title);
  const [weight, setWeight] = useState(occ.weight);
  const [zone, setZone] = useState(occ.zone);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!state) return null;
  const adults = state.members.filter((m) => m.role === 'adult');
  const isChildTask = state.members.find((m) => m.id === occ.assignee)?.role === 'child';
  const days = Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i));

  if (occ.status === 'done') {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <h3>{occ.title}</h3>
          <p className="muted">Cette mission est marquée faite. Coché par erreur ?</p>
          <button
            className="btn secondary sheet-close"
            onClick={() => {
              void undoOccurrence(occ);
              onClose();
            }}
          >
            ↩️ Remettre à faire
          </button>
          <button className="btn ghost sheet-close" style={{ color: 'var(--encre-douce)' }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="sheet-backdrop" onClick={onClose}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-handle" />
          <h3>Modifier la tâche</h3>
          <input className="ob-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className="muted">Catégorie :</p>
          <div className="move-row wrap">
            {state.categories.map((c) => (
              <button key={c.id} className={`move-chip ${zone === c.id ? 'active' : ''}`} onClick={() => setZone(c.id)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <p className="muted">Pénibilité :</p>
          <div className="move-row">
            {[1, 2, 3, 4, 5].map((w) => (
              <button key={w} className={`move-chip ${weight === w ? 'active' : ''}`} onClick={() => setWeight(w)}>
                {w} 🌰
              </button>
            ))}
          </div>
          <button
            className="btn sheet-close"
            disabled={!title.trim()}
            onClick={() => {
              void editOccurrence(occ, { title: title.trim(), zone, weight });
              notifyInfo(`« ${title.trim()} » modifiée ✏️`);
              onClose();
            }}
          >
            Enregistrer
          </button>
          <button className="btn ghost sheet-close" style={{ color: 'var(--encre-douce)' }} onClick={() => setEditMode(false)}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{occ.title}</h3>
        {!isChildTask && (
          <>
            <p className="muted">Qui s'en occupe ?</p>
            <div className="move-row">
              {adults.map((m) => (
                <button
                  key={m.id}
                  className={`move-chip ${occ.assignee === m.id ? 'active' : ''}`}
                  onClick={() => {
                    void moveOccurrence(occ, { assignee: m.id });
                    onClose();
                  }}
                >
                  <Creature species={m.creature} size={32} /> {m.name}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="muted">Quel jour ?</p>
        <div className="move-row wrap">
          {days.map((d, i) => (
            <button
              key={d}
              className={`move-chip day ${occ.date === d ? 'active' : ''}`}
              onClick={() => {
                void moveOccurrence(occ, { date: d });
                onClose();
              }}
            >
              {DAY_NAMES[i].slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="move-row">
          <button className="move-chip" onClick={() => setEditMode(true)}>
            ✏️ Modifier
          </button>
          {!confirmDelete ? (
            <button className="move-chip" onClick={() => setConfirmDelete(true)}>
              🗑️ Supprimer
            </button>
          ) : (
            <button
              className="move-chip danger"
              onClick={() => {
                void deleteOccurrence(occ);
                notifyInfo(`« ${occ.title} » supprimée 🗑️`);
                onClose();
              }}
            >
              🗑️ Confirmer la suppression
            </button>
          )}
        </div>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export function AddSheet({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const addOccurrence = useStore((s) => s.addOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const memberId = useStore((s) => s.memberId);
  const [title, setTitle] = useState('');
  const [zone, setZone] = useState('rangement');
  const [assignees, setAssignees] = useState<string[]>(memberId ? [memberId] : []);
  if (!state) return null;

  const toggle = (id: string) =>
    setAssignees((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit() {
    if (!title.trim() || assignees.length === 0) return;
    const names = state!.members.filter((m) => assignees.includes(m.id)).map((m) => m.name);
    await addOccurrence({ title: title.trim(), zone, assignees });
    notifyInfo(
      assignees.length > 1
        ? `« ${title.trim()} » ajoutée pour ${names.join(' et ')} 👥`
        : `« ${title.trim()} » ajoutée pour ${names[0] ?? 'toi'} ✅`,
    );
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Nouvelle tâche</h3>
        <input
          className="ob-input"
          placeholder="Quoi faire ? (ex : réparer le portail)"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
        <p className="muted">Catégorie :</p>
        <div className="move-row wrap">
          {state.categories.map((c) => (
            <button key={c.id} className={`move-chip ${zone === c.id ? 'active' : ''}`} onClick={() => setZone(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <p className="muted">Pour qui ? {assignees.length > 1 && <span className="add-shared">👥 à plusieurs</span>}</p>
        <div className="move-row wrap">
          {state.members.map((m) => (
            <button
              key={m.id}
              className={`move-chip ${assignees.includes(m.id) ? 'active' : ''}`}
              onClick={() => toggle(m.id)}
            >
              <Creature species={m.creature} size={26} /> {m.name}
            </button>
          ))}
        </div>
        <button className="btn sheet-close" disabled={!title.trim() || assignees.length === 0} onClick={() => void submit()}>
          Ajouter (aujourd'hui)
        </button>
        <p className="muted week-add-hint">
          Sélectionne plusieurs personnes pour une tâche à faire à plusieurs : chacune la coche et gagne ses glands.
        </p>
      </div>
    </div>
  );
}
