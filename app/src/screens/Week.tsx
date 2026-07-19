import { useState } from 'react';
import { useStore } from '../store';
import { Creature } from '../components/Creature';
import { catInfo } from '../zones';
import { addDays } from '@shared/dates';
import { api } from '../api';
import type { Occurrence } from '../types';
import './week.css';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function Week() {
  const state = useStore((s) => s.state);
  const applyState = useStore((s) => s.applyState);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i));

  async function regenerate() {
    setBusy(true);
    try {
      applyState(await api('/week/regenerate', { body: {} }));
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
                  <span className="week-task-title">{o.title}</span>
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
  const state = useStore((s) => s.state);
  const moveOccurrence = useStore((s) => s.moveOccurrence);
  const undoOccurrence = useStore((s) => s.undoOccurrence);
  const editOccurrence = useStore((s) => s.editOccurrence);
  const deleteOccurrence = useStore((s) => s.deleteOccurrence);
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

function AddSheet({ onClose }: { onClose: () => void }) {
  const state = useStore((s) => s.state);
  const addOccurrence = useStore((s) => s.addOccurrence);
  const memberId = useStore((s) => s.memberId);
  const [title, setTitle] = useState('');
  const [zone, setZone] = useState('rangement');
  if (!state) return null;

  async function submit() {
    if (!title.trim()) return;
    await addOccurrence({ title: title.trim(), zone, assignee: memberId ?? undefined });
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
        <button className="btn sheet-close" disabled={!title.trim()} onClick={() => void submit()}>
          Ajouter (pour moi, aujourd'hui)
        </button>
        <p className="muted week-add-hint">Tu pourras la déplacer ou la proposer ensuite depuis la semaine.</p>
      </div>
    </div>
  );
}
