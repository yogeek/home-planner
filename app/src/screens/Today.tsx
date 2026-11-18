import { useEffect, useRef, useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import { AddSheet } from './Week';
import { catInfo, MOMENT_META, momentRank, shortDay } from '../zones';
import { addDays } from '@shared/dates';
import type { Member, Occurrence } from '../types';
import { useEscape } from '../useEscape';
import './today.css';

const seenKey = (id: string) => `village.thanksSeen.${id}`;

export function Today() {
  const state = useStore((s) => s.state);
  const me = useMe();
  const call = useStore((s) => s.call);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const [adding, setAdding] = useState(false);
  const [seen, setSeen] = useState(() => (me ? (localStorage.getItem(seenKey(me.id)) ?? '') : ''));
  if (!state || !me) return null;

  const byOrder = (a: Occurrence, b: Occurrence) =>
    Number(a.status === 'done') - Number(b.status === 'done') || momentRank(a.moment) - momentRank(b.moment) || b.weight - a.weight;

  const mine = state.week.filter((o) => o.date === state.today && o.assignee === me.id).sort(byOrder);
  const late = state.overdue.filter((o) => o.assignee === me.id && o.status === 'todo');
  const open = [...state.overdue, ...state.week].filter(
    (o, i, all) => o.assignee === null && o.status === 'todo' && o.date <= state.today && all.findIndex((x) => x.id === o.id) === i,
  );
  const remaining = mine.filter((o) => o.status === 'todo').length + late.length;
  const occById = (id: string) => [...state.week, ...state.nextWeek, ...state.overdue].find((o) => o.id === id);
  const memberById = (id: string | null | undefined) => state.members.find((m) => m.id === id);

  // Échanges proposés à moi
  const swapsForMe = state.swaps.filter((s) => s.toMember === me.id);
  // Mercis reçus que je n'ai pas encore vus
  const newThanks = state.thanks
    .filter((t) => t.at > seen && t.from !== me.id && occById(t.occurrenceId)?.assignee === me.id)
    .sort((a, b) => b.at.localeCompare(a.at));

  // L'équipe : chaque autre habitant qui a des missions aujourd'hui
  const team = state.members
    .filter((m) => m.id !== me.id)
    .map((m) => ({ m, tasks: state.week.filter((o) => o.date === state.today && o.assignee === m.id) }))
    .filter((t) => t.tasks.length > 0);

  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(state.today + 'T12:00:00'),
  );

  function dismissThanks() {
    const now = new Date().toISOString();
    localStorage.setItem(seenKey(me!.id), now);
    setSeen(now);
  }

  return (
    <div className="screen today-screen">
      <div className="title-row">
        <h2>
          {mine.length === 0 && late.length === 0
            ? 'Journée libre !'
            : remaining === 0
              ? 'Tout est fait, bravo !'
              : `${remaining} mission${remaining > 1 ? 's' : ''} pour toi`}
        </h2>
        <span className="today-date">{dateFmt}</span>
      </div>

      {state.settings.paused && (
        <div className="card today-note">🏖️ Le village est en vacances jusqu'au {shortDay(state.settings.pauseUntil!)}. Profitez !</div>
      )}

      {newThanks.length > 0 && (
        <div className="card thanks-card" role="status">
          <span className="thanks-heart" aria-hidden>
            💛
          </span>
          <div className="thanks-body">
            {newThanks.slice(0, 3).map((t) => (
              <p key={t.occurrenceId + t.from}>
                <strong>{memberById(t.from)?.name}</strong> te dit merci pour « {occById(t.occurrenceId)?.title} »
              </p>
            ))}
            {newThanks.length > 3 && <p className="muted">et {newThanks.length - 3} autre(s) merci !</p>}
          </div>
          <button className="btn secondary thanks-ok" onClick={dismissThanks}>
            Ça fait plaisir !
          </button>
        </div>
      )}

      {swapsForMe.map((sw) => {
        const theirs = occById(sw.fromOcc);
        const mineOcc = occById(sw.toOcc);
        const from = memberById(sw.fromMember);
        if (!theirs || !mineOcc || !from) return null;
        return (
          <div key={sw.id} className="card swap-card">
            <p>
              🔁 <strong>{from.name}</strong> te propose un échange : sa tâche <strong>« {theirs.title} »</strong> (
              {shortDay(theirs.date)}) contre ta tâche <strong>« {mineOcc.title} »</strong> ({shortDay(mineOcc.date)}).
            </p>
            <div className="swap-actions">
              <button
                className="btn"
                onClick={async () => {
                  if (await call(`/swaps/${sw.id}/accept`)) notifyInfo('Échange accepté 🔁');
                }}
              >
                Accepter
              </button>
              <button className="btn secondary" onClick={() => void call(`/swaps/${sw.id}/decline`)}>
                Non merci
              </button>
            </div>
          </div>
        );
      })}

      {late.length > 0 && (
        <>
          <h3 className="today-subtitle display">⏰ En retard</h3>
          <div className="today-list">
            {late.map((o) => (
              <TaskCard key={o.id} occ={o} overdue />
            ))}
          </div>
        </>
      )}

      {mine.length === 0 && late.length === 0 && (
        <div className="card today-empty">
          <Creature species={me.creature} size={72} mood="joy" />
          <p>Journée libre ! Le village se repose. 🌿</p>
        </div>
      )}

      {mine.length > 0 && late.length > 0 && <h3 className="today-subtitle display">☀️ Aujourd'hui</h3>}
      <div className="today-list">
        {mine.map((o) => (
          <TaskCard key={o.id} occ={o} />
        ))}
      </div>

      {open.length > 0 && (
        <>
          <h3 className="today-subtitle display">🙋 À prendre</h3>
          <p className="today-hint">Ces tâches sont pour le premier qui s'en occupe.</p>
          <div className="today-list">
            {open.map((o) => (
              <OpenTaskCard key={o.id} occ={o} />
            ))}
          </div>
        </>
      )}

      <button className="btn secondary today-add" onClick={() => setAdding(true)}>
        + Ajouter une tâche
      </button>
      {adding && <AddSheet onClose={() => setAdding(false)} />}

      {team.length > 0 && (
        <>
          <h3 className="today-subtitle display">L'équipe aujourd'hui</h3>
          {team.some((t) => t.tasks.some((o) => o.status === 'done')) && (
            <p className="today-hint">Touche un 🤍 pour dire merci.</p>
          )}
          {team.map(({ m, tasks }) => (
            <TeamCard key={m.id} member={m} tasks={tasks} />
          ))}
        </>
      )}
    </div>
  );
}

/** Ce que fait un autre habitant aujourd'hui, avec un 💛 pour dire merci */
function TeamCard({ member, tasks }: { member: Member; tasks: Occurrence[] }) {
  const state = useStore((s) => s.state);
  const me = useMe();
  const call = useStore((s) => s.call);
  if (!state || !me) return null;
  const done = tasks.filter((t) => t.status === 'done');
  return (
    <div className="card team-card">
      <Creature species={member.creature} size={44} mood={done.length === tasks.length ? 'joy' : 'normal'} />
      <div className="team-body">
        <div>
          <strong>{member.name}</strong> : {done.length}/{tasks.length} mission{tasks.length > 1 ? 's' : ''}
          {done.length === tasks.length ? ' 💪' : ''}
        </div>
        {done.length > 0 && (
          <div className="team-done">
            {done.map((t) => {
              const thanked = state.thanks.some((x) => x.occurrenceId === t.id && x.from === me.id);
              return (
                <button
                  key={t.id}
                  className={`thanks-chip ${thanked ? 'on' : ''}`}
                  disabled={thanked}
                  onClick={() => void call(`/occurrences/${t.id}/thanks`, { from: me.id })}
                  aria-label={thanked ? `Merci envoyé pour ${t.title}` : `Dire merci pour ${t.title}`}
                >
                  {thanked ? '💛' : '🤍'} {t.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tâche « à prendre » : je m'en occupe, ou je la coche directement */
function OpenTaskCard({ occ }: { occ: Occurrence }) {
  const state = useStore((s) => s.state);
  const memberId = useStore((s) => s.memberId);
  const call = useStore((s) => s.call);
  const doneOccurrence = useStore((s) => s.doneOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  if (!state) return null;
  const meta = catInfo(state.categories, occ.zone);
  return (
    <div className="task-card open">
      <button className="task-check" onClick={() => void doneOccurrence(occ)} aria-label={`Marquer fait : ${occ.title}`} />
      <div className="task-body">
        <span className="task-title">{occ.title}</span>
        <span className="task-meta">
          {meta.emoji} {meta.place} · {'🌰'.repeat(occ.weight)}
          {occ.date < state.today ? ` · depuis ${shortDay(occ.date)}` : ''}
        </span>
      </div>
      <button
        className="btn secondary task-take"
        onClick={async () => {
          if (await call(`/occurrences/${occ.id}/take`, { byMemberId: memberId })) notifyInfo(`« ${occ.title} » est pour toi 🙋`);
        }}
      >
        Je prends
      </button>
    </div>
  );
}

function TaskCard({ occ, overdue = false }: { occ: Occurrence; overdue?: boolean }) {
  const doneOccurrence = useStore((s) => s.doneOccurrence);
  const undoOccurrence = useStore((s) => s.undoOccurrence);
  const moveOccurrence = useStore((s) => s.moveOccurrence);
  const deleteOccurrence = useStore((s) => s.deleteOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  const setTab = useStore((s) => s.setTab);
  const state = useStore((s) => s.state);
  const me = useMe();
  const [menu, setMenu] = useState(false);
  const [popping, setPopping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheet, setSheet] = useState<'hand' | 'swap' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Le menu se ferme en touchant ailleurs ou avec Échap
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenu(false);
        setConfirmDelete(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  if (!state || !me) return null;
  const meta = catInfo(state.categories, occ.zone);
  const done = occ.status === 'done';
  const handedBy = occ.handedBy && occ.handedBy !== me.id ? state.members.find((m) => m.id === occ.handedBy) : null;
  const pendingSwap = state.swaps.find((s) => s.fromOcc === occ.id);
  const swapTarget = pendingSwap ? state.members.find((m) => m.id === pendingSwap.toMember) : null;
  const thanks = state.thanks.filter((t) => t.occurrenceId === occ.id);
  // Coéquipiers d'une tâche à plusieurs (les autres occurrences du même groupe)
  const teammates = occ.groupId
    ? state.week
        .filter((o) => o.groupId === occ.groupId && o.assignee !== occ.assignee)
        .map((o) => ({ member: state.members.find((m) => m.id === o.assignee), done: o.status === 'done' }))
        .filter((t) => t.member)
    : [];

  function handleDone() {
    if (done) {
      void undoOccurrence(occ);
      return;
    }
    setPopping(true);
    setTimeout(() => setPopping(false), 700);
    const restantes = state!.week.filter(
      (o) => o.date === state!.today && o.assignee === me!.id && o.status === 'todo' && o.id !== occ.id,
    ).length;
    void doneOccurrence(occ);
    if (restantes === 0 && occ.date === state!.today) {
      // Dernière du jour : on savoure la récompense sur le village
      setTimeout(() => setTab('village'), 900);
    } else {
      notifyInfo(`+${occ.weight} 🌰${restantes > 0 ? ` · encore ${restantes} mission${restantes > 1 ? 's' : ''} 🌿` : ' 🌿'}`);
    }
  }

  const close = () => {
    setMenu(false);
    setConfirmDelete(false);
  };

  return (
    <div ref={ref} className={`task-card ${done ? 'done' : ''} ${popping ? 'popping' : ''} ${overdue ? 'late' : ''}`}>
      <button className={`task-check ${done ? 'checked' : ''}`} onClick={handleDone} aria-label={done ? `Annuler : ${occ.title}` : `Marquer fait : ${occ.title}`}>
        {done ? '✓' : ''}
      </button>
      <div className="task-body" onClick={() => !done && setMenu(!menu)}>
        <span className="task-title">{occ.title}</span>
        <span className="task-meta">
          {occ.moment && <span className="task-moment">{MOMENT_META[occ.moment].emoji} {MOMENT_META[occ.moment].label} · </span>}
          {meta.emoji} {meta.place} · {'🌰'.repeat(occ.weight)}
          {overdue && ` · prévue ${shortDay(occ.date)}`}
        </span>
        {handedBy && <span className="task-shared">🤝 confiée par {handedBy.name}</span>}
        {swapTarget && <span className="task-shared">🔁 échange proposé à {swapTarget.name}</span>}
        {teammates.length > 0 && (
          <span className="task-shared">
            👥 avec {teammates.map((t) => `${t.member!.name}${t.done ? ' ✅' : ''}`).join(', ')}
          </span>
        )}
        {done && thanks.length > 0 && (
          <span className="task-shared">
            💛 merci de {thanks.map((t) => state.members.find((m) => m.id === t.from)?.name).join(', ')}
          </span>
        )}
      </div>
      {!done && (
        <button className="task-more" onClick={() => setMenu(!menu)} aria-label={`Options pour ${occ.title}`} aria-expanded={menu}>
          ⋯
        </button>
      )}
      {popping && (
        <span className="task-pop" aria-hidden>
          +{occ.weight} 🌰
        </span>
      )}
      {menu && !done && (
        <div className="task-menu" role="menu">
          {overdue ? (
            <button
              role="menuitem"
              onClick={() => {
                void moveOccurrence(occ, { date: state.today });
                notifyInfo(`« ${occ.title} » remise à aujourd'hui 📅`);
                close();
              }}
            >
              📅 La faire aujourd'hui
            </button>
          ) : (
            <button
              role="menuitem"
              onClick={() => {
                void moveOccurrence(occ, { date: addDays(occ.date, 1) });
                notifyInfo(`« ${occ.title} » reportée à demain ⏭️`, {
                  label: 'Annuler',
                  run: () => void moveOccurrence({ ...occ, date: addDays(occ.date, 1) }, { date: occ.date }),
                });
                close();
              }}
            >
              ⏭️ Demain
            </button>
          )}
          {state.members.length > 1 && (
            <button
              role="menuitem"
              onClick={() => {
                setSheet('hand');
                close();
              }}
            >
              🤝 Confier à...
            </button>
          )}
          {state.members.length > 1 && !pendingSwap && (
            <button
              role="menuitem"
              onClick={() => {
                setSheet('swap');
                close();
              }}
            >
              🔁 Proposer un échange...
            </button>
          )}
          <button
            role="menuitem"
            className="task-menu-danger"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void deleteOccurrence(occ);
              notifyInfo(`« ${occ.title} » supprimée 🗑️`);
              close();
            }}
          >
            🗑️ {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </button>
        </div>
      )}
      {sheet === 'hand' && <HandSheet occ={occ} onClose={() => setSheet(null)} />}
      {sheet === 'swap' && <SwapSheet occ={occ} onClose={() => setSheet(null)} />}
    </div>
  );
}

/** Confier une tâche à un autre habitant (avec annulation possible) */
function HandSheet({ occ, onClose }: { occ: Occurrence; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const me = useMe();
  const moveOccurrence = useStore((s) => s.moveOccurrence);
  const notifyInfo = useStore((s) => s.notifyInfo);
  if (!state || !me) return null;
  const others = state.members.filter((m) => m.id !== occ.assignee);

  function give(m: Member) {
    void moveOccurrence(occ, { assignee: m.id, handedBy: me!.id });
    notifyInfo(`Confiée à ${m.name} 🤝`, {
      label: 'Annuler',
      run: () => void moveOccurrence({ ...occ, assignee: m.id }, { assignee: occ.assignee, handedBy: null }),
    });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Confier « {occ.title} » à...</h3>
        <p className="muted">La personne la verra dans ses missions, avec ton nom.</p>
        <div className="move-row wrap">
          {others.map((m) => (
            <button key={m.id} className="move-chip" onClick={() => give(m)}>
              <Creature species={m.creature} size={30} /> {m.name}
            </button>
          ))}
        </div>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/** Proposer un échange : ma tâche contre une tâche à venir d'un autre habitant */
function SwapSheet({ occ, onClose }: { occ: Occurrence; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const call = useStore((s) => s.call);
  const notifyInfo = useStore((s) => s.notifyInfo);
  if (!state) return null;
  const candidates = [...state.week, ...state.nextWeek].filter(
    (o) => o.status === 'todo' && o.assignee && o.assignee !== occ.assignee && o.date >= state.today,
  );
  const people = state.members.filter((m) => candidates.some((o) => o.assignee === m.id));

  async function propose(target: Occurrence) {
    const name = state!.members.find((m) => m.id === target.assignee)?.name;
    if (await call('/swaps', { fromOcc: occ.id, toOcc: target.id })) {
      notifyInfo(`Échange proposé à ${name} 🔁`);
      onClose();
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>Échanger « {occ.title} »</h3>
        <p className="muted">Choisis la tâche que tu ferais à la place. L'autre personne pourra accepter ou refuser.</p>
        {people.length === 0 && <p className="muted">Personne n'a de tâche à échanger pour l'instant.</p>}
        <div className="swap-list">
          {people.map((m) => (
            <section key={m.id}>
              <h4>
                <Creature species={m.creature} size={24} /> {m.name}
              </h4>
              {candidates
                .filter((o) => o.assignee === m.id)
                .slice(0, 8)
                .map((o) => (
                  <button key={o.id} className="swap-option" onClick={() => void propose(o)}>
                    <span>{o.title}</span>
                    <span className="muted">
                      {shortDay(o.date)} · {'🌰'.repeat(o.weight)}
                    </span>
                  </button>
                ))}
            </section>
          ))}
        </div>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
