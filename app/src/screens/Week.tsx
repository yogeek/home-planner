import { useState } from 'react';
import { useStore } from '../store';
import { Creature } from '../components/Creature';
import { catInfo, MOMENT_META } from '../zones';
import { addDays, dayOfWeek } from '@shared/dates';
import { MOMENTS } from '@shared/types';
import { api } from '../api';
import type { Moment, Occurrence } from '../types';
import { useEscape } from '../useEscape';
import './week.css';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function Week() {
  const state = useStore((s) => s.state);
  const applyState = useStore((s) => s.applyState);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [editing, setEditing] = useState<Occurrence | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'cur' | 'next'>('cur');

  if (!state) return null;
  const isNext = view === 'next' && state.nextWeek.length > 0;
  const start = isNext ? addDays(state.weekStart, 7) : state.weekStart;
  const occs = isNext ? state.nextWeek : state.week;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  // À partir du vendredi, on peut préparer la semaine suivante (sinon elle arrive dimanche soir)
  const canPrepareNext = state.nextWeek.length === 0 && dayOfWeek(state.today) >= 4;

  async function regenerate(weekStart: string, msg: string) {
    setBusy(true);
    try {
      applyState(await api('/week/regenerate', { body: { weekStart } }));
      notifyInfo(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen week-screen">
      <div className="title-row">
        <h2>{isNext ? 'La semaine prochaine' : 'La semaine du village'}</h2>
        <button
          className="week-regen"
          onClick={() => void regenerate(start, 'Semaine rééquilibrée ⚖️')}
          disabled={busy}
          title="Répartir à nouveau les tâches à venir (les tâches faites ou déplacées à la main sont gardées)"
        >
          {busy ? '...' : '⚖️ Rééquilibrer'}
        </button>
      </div>

      {(state.nextWeek.length > 0 || canPrepareNext) && (
        <div className="week-switch" role="tablist">
          <button role="tab" aria-selected={!isNext} className={!isNext ? 'active' : ''} onClick={() => setView('cur')}>
            Cette semaine
          </button>
          {state.nextWeek.length > 0 ? (
            <button role="tab" aria-selected={isNext} className={isNext ? 'active' : ''} onClick={() => setView('next')}>
              Semaine prochaine
            </button>
          ) : (
            <button
              className="week-prepare"
              disabled={busy}
              onClick={async () => {
                await regenerate(addDays(state.weekStart, 7), 'Semaine prochaine préparée 🗓️');
                setView('next');
              }}
            >
              🗓️ Préparer la suivante
            </button>
          )}
        </div>
      )}

      {/* Qui fait quoi : un coup d'œil par personne */}
      <div className="week-team">
        {state.members.map((m) => {
          const mine = occs.filter((o) => o.assignee === m.id && o.status !== 'skipped');
          const done = mine.filter((o) => o.status === 'done').length;
          const away = m.awayUntil && m.awayUntil >= start;
          return (
            <div key={m.id} className="week-team-person">
              <Creature species={m.creature} size={30} mood={mine.length > 0 && done === mine.length ? 'joy' : 'normal'} />
              <span className="week-team-name">{m.name}</span>
              <span className="week-team-count">{away && mine.length === 0 ? '🧳' : `${done}/${mine.length}`}</span>
            </div>
          );
        })}
      </div>

      {days.map((date, i) => {
        const tasks = occs.filter((o) => o.date === date && o.status !== 'skipped');
        const past = date < state.today;
        return (
          <section key={date} className={`week-day ${date === state.today ? 'today' : ''} ${past ? 'past' : ''}`}>
            <h3>
              {DAY_NAMES[i]}
              {date === state.today && <span className="week-today-tag">aujourd'hui</span>}
            </h3>
            {tasks.length === 0 && <p className="week-free">{past ? 'Rien de prévu' : 'Repos 🍃'}</p>}
            {tasks.map((o) => {
              const member = state.members.find((m) => m.id === o.assignee);
              const late = past && o.status === 'todo';
              return (
                <button key={o.id} className={`week-task ${o.status} ${late ? 'late' : ''}`} onClick={() => setEditing(o)}>
                  <span className="week-task-zone" aria-hidden>
                    {catInfo(state.categories, o.zone).emoji}
                  </span>
                  <span className="week-task-title">
                    {o.title}
                    {o.moment && <span className="week-moment"> {MOMENT_META[o.moment].emoji}</span>}
                    {o.groupId && <span className="week-shared" title="Tâche à plusieurs"> 👥</span>}
                    {late && <span className="week-late"> en retard</span>}
                  </span>
                  <span className="week-task-weight" aria-label={`${o.weight} noisette${o.weight > 1 ? 's' : ''}`}>
                    {'🌰'.repeat(o.weight)}
                  </span>
                  {member ? (
                    <span aria-label={member.name}>
                      <Creature species={member.creature} size={26} />
                    </span>
                  ) : (
                    <span className="week-open" aria-label="À prendre par n'importe qui">
                      🙋
                    </span>
                  )}
                </button>
              );
            })}
            {!past && (
              <button className="week-day-add" onClick={() => setAdding(date)} aria-label={`Ajouter une tâche ${DAY_NAMES[i].toLowerCase()}`}>
                +
              </button>
            )}
          </section>
        );
      })}

      <button className="btn week-add" onClick={() => setAdding(state.today >= start ? state.today : start)}>
        + Ajouter une tâche
      </button>

      {editing && (
        <MoveSheet
          occ={[...state.week, ...state.nextWeek].find((o) => o.id === editing.id) ?? editing}
          weekStart={start}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && <AddSheet defaultDate={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function MoveSheet({ occ, weekStart, onClose }: { occ: Occurrence; weekStart: string; onClose: () => void }) {
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
  const [moment, setMoment] = useState<Moment | null>(occ.moment ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!state) return null;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
          <input className="ob-input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Nom de la tâche" />
          <p className="muted">Catégorie :</p>
          <div className="move-row wrap">
            {state.categories.map((c) => (
              <button key={c.id} aria-pressed={zone === c.id} className={`move-chip ${zone === c.id ? 'active' : ''}`} onClick={() => setZone(c.id)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <p className="muted">Pénibilité :</p>
          <WeightPicker value={weight} onChange={setWeight} />
          <p className="muted">Moment :</p>
          <MomentPicker value={moment} onChange={setMoment} />
          <button
            className="btn sheet-close"
            disabled={!title.trim()}
            onClick={() => {
              void editOccurrence(occ, { title: title.trim(), zone, weight, moment });
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
        <p className="muted">Qui s'en occupe ?</p>
        <div className="move-row wrap">
          {state.members.map((m) => (
            <button
              key={m.id}
              aria-pressed={occ.assignee === m.id}
              className={`move-chip ${occ.assignee === m.id ? 'active' : ''}`}
              onClick={() => {
                void moveOccurrence(occ, { assignee: m.id });
                onClose();
              }}
            >
              <Creature species={m.creature} size={28} /> {m.name}
            </button>
          ))}
          <button
            aria-pressed={occ.assignee === null}
            className={`move-chip ${occ.assignee === null ? 'active' : ''}`}
            onClick={() => {
              void moveOccurrence(occ, { assignee: null });
              onClose();
            }}
          >
            🙋 N'importe qui
          </button>
        </div>
        <p className="muted">Quel jour ?</p>
        <div className="move-row wrap">
          {days.map((d, i) => (
            <button
              key={d}
              aria-pressed={occ.date === d}
              disabled={d < state.today}
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

export function WeightPicker({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  return (
    <div className="move-row">
      {[1, 2, 3, 4, 5].map((w) => (
        <button key={w} aria-pressed={value === w} className={`move-chip ${value === w ? 'active' : ''}`} onClick={() => onChange(w)}>
          {w} 🌰
        </button>
      ))}
    </div>
  );
}

export function MomentPicker({ value, onChange }: { value: Moment | null; onChange: (m: Moment | null) => void }) {
  return (
    <div className="move-row wrap">
      <button aria-pressed={value === null} className={`move-chip ${value === null ? 'active' : ''}`} onClick={() => onChange(null)}>
        N'importe quand
      </button>
      {MOMENTS.map((m) => (
        <button key={m} aria-pressed={value === m} className={`move-chip ${value === m ? 'active' : ''}`} onClick={() => onChange(m)}>
          {MOMENT_META[m].emoji} {MOMENT_META[m].label}
        </button>
      ))}
    </div>
  );
}

export function AddSheet({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const addOccurrence = useStore((s) => s.addOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const memberId = useStore((s) => s.memberId);
  const [title, setTitle] = useState('');
  const [zone, setZone] = useState('rangement');
  const [assignees, setAssignees] = useState<string[]>(memberId ? [memberId] : []);
  const [pool, setPool] = useState(false);
  const [date, setDate] = useState(defaultDate ?? state?.today ?? '');
  const [moment, setMoment] = useState<Moment | null>(null);
  const [weight, setWeight] = useState(2);
  if (!state) return null;

  // Les 7 prochains jours, et le jour demandé s'il est plus loin
  const upcoming = Array.from({ length: 7 }, (_, i) => addDays(state.today, i));
  if (date && !upcoming.includes(date)) upcoming.push(date);
  const dayLabel = (d: string) =>
    d === state.today ? "Aujourd'hui" : d === addDays(state.today, 1) ? 'Demain' : DAY_NAMES[dayOfWeek(d)].slice(0, 3) + ` ${Number(d.slice(8))}`;

  const toggle = (id: string) => {
    setPool(false);
    setAssignees((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const ready = title.trim() && (pool || assignees.length > 0);

  async function submit() {
    if (!ready) return;
    const names = state!.members.filter((m) => assignees.includes(m.id)).map((m) => m.name);
    await addOccurrence({ title: title.trim(), zone, assignees: pool ? [] : assignees, pool, date, moment, weight });
    const when = dayLabel(date).toLowerCase();
    notifyInfo(
      pool
        ? `« ${title.trim()} » à prendre, ${when} 🙋`
        : assignees.length > 1
          ? `« ${title.trim()} » pour ${names.join(' et ')}, ${when} 👥`
          : `« ${title.trim()} » pour ${names[0] ?? 'toi'}, ${when} ✅`,
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
          aria-label="Quoi faire ?"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />
        <p className="muted">Quand ?</p>
        <div className="move-row wrap">
          {upcoming.map((d) => (
            <button key={d} aria-pressed={date === d} className={`move-chip day ${date === d ? 'active' : ''}`} onClick={() => setDate(d)}>
              {dayLabel(d)}
            </button>
          ))}
        </div>
        <MomentPicker value={moment} onChange={setMoment} />
        <p className="muted">
          Pour qui ? {assignees.length > 1 && !pool && <span className="add-shared">👥 à plusieurs</span>}
        </p>
        <div className="move-row wrap">
          {state.members.map((m) => (
            <button
              key={m.id}
              aria-pressed={!pool && assignees.includes(m.id)}
              className={`move-chip ${!pool && assignees.includes(m.id) ? 'active' : ''}`}
              onClick={() => toggle(m.id)}
            >
              <Creature species={m.creature} size={26} /> {m.name}
            </button>
          ))}
          <button aria-pressed={pool} className={`move-chip ${pool ? 'active' : ''}`} onClick={() => setPool(!pool)}>
            🙋 N'importe qui
          </button>
        </div>
        <p className="muted">Catégorie :</p>
        <div className="move-row wrap">
          {state.categories.map((c) => (
            <button key={c.id} aria-pressed={zone === c.id} className={`move-chip ${zone === c.id ? 'active' : ''}`} onClick={() => setZone(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <p className="muted">Pénibilité (noisettes gagnées) :</p>
        <WeightPicker value={weight} onChange={setWeight} />
        <button className="btn sheet-close" disabled={!ready} onClick={() => void submit()}>
          Ajouter
        </button>
        <p className="muted week-add-hint">
          Plusieurs personnes = tâche à faire ensemble (chacune la coche et gagne ses noisettes). « N'importe qui » = le
          premier qui la prend.
        </p>
      </div>
    </div>
  );
}
