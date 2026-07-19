import { useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import { AddSheet } from './Week';
import { catInfo } from '../zones';
import { addDays } from '@shared/dates';
import type { Occurrence } from '../types';
import './today.css';

export function Today() {
  const state = useStore((s) => s.state);
  const me = useMe();
  const [adding, setAdding] = useState(false);
  if (!state || !me) return null;

  const mine = state.week
    .filter((o) => o.date === state.today && o.assignee === me.id)
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || b.weight - a.weight);

  const partner = state.members.find((m) => m.role === 'adult' && m.id !== me.id);
  const child = state.members.find((m) => m.role === 'child');
  const partnerDone = state.week.filter((o) => o.date === state.today && o.assignee === partner?.id && o.status === 'done');
  const childToday = state.week.filter((o) => o.date === state.today && o.assignee === child?.id);
  const remaining = mine.filter((o) => o.status === 'todo').length;

  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(state.today + 'T12:00:00'),
  );

  return (
    <div className="screen today-screen">
      <div className="title-row">
        <h2>
          {mine.length === 0
            ? 'Journée libre !'
            : remaining === 0
              ? 'Tout est fait, bravo !'
              : `${remaining} mission${remaining > 1 ? 's' : ''} pour toi`}
        </h2>
        <span className="today-date">{dateFmt}</span>
      </div>

      {mine.length === 0 && (
        <div className="card today-empty">
          <Creature species={me.creature} size={72} mood="joy" />
          <p>Journée libre ! Le village se repose. 🌿</p>
        </div>
      )}

      <div className="today-list">
        {mine.map((o) => (
          <TaskCard key={o.id} occ={o} />
        ))}
      </div>

      <button className="btn secondary today-add" onClick={() => setAdding(true)}>
        + Ajouter une tâche pour aujourd'hui
      </button>
      {adding && <AddSheet onClose={() => setAdding(false)} />}

      {(partnerDone.length > 0 || childToday.length > 0) && (
        <>
          <h3 className="today-subtitle display">L'équipe aujourd'hui</h3>
          {partner && partnerDone.length > 0 && (
            <div className="card team-card">
              <Creature species={partner.creature} size={44} mood="joy" />
              <div>
                <strong>{partner.name}</strong> a déjà fait :{' '}
                {partnerDone.map((o) => o.title.toLowerCase()).join(', ')} 💪
              </div>
            </div>
          )}
          {child && childToday.length > 0 && (
            <div className="card team-card">
              <Creature species={child.creature} size={44} />
              <div>
                <strong>{child.name}</strong> :{' '}
                {childToday.filter((o) => o.status === 'done').length}/{childToday.length} mission
                {childToday.length > 1 ? 's' : ''} du jour
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TaskCard({ occ }: { occ: Occurrence }) {
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

  const meta = catInfo(state?.categories, occ.zone);
  const done = occ.status === 'done';
  const partner = state?.members.find((m) => m.role === 'adult' && m.id !== me?.id);
  // Coéquipiers d'une tâche à plusieurs (les autres occurrences du même groupe)
  const teammates = occ.groupId
    ? (state?.week ?? [])
        .filter((o) => o.groupId === occ.groupId && o.assignee !== occ.assignee)
        .map((o) => ({ member: state?.members.find((m) => m.id === o.assignee), done: o.status === 'done' }))
        .filter((t) => t.member)
    : [];

  function handleDone() {
    if (done) {
      void undoOccurrence(occ);
      return;
    }
    setPopping(true);
    setTimeout(() => setPopping(false), 700);
    // Combien de missions me restent-il après celle-ci ?
    const restantes = (state?.week ?? []).filter(
      (o) => o.date === occ.date && o.assignee === occ.assignee && o.status === 'todo' && o.id !== occ.id,
    ).length;
    void doneOccurrence(occ);
    if (restantes === 0) {
      // Dernière du jour : on savoure la récompense sur le village
      setTimeout(() => setTab('village'), 900);
    } else {
      // Il en reste : on reste sur la liste pour enchaîner
      notifyInfo(`+${occ.weight} 🌰 · encore ${restantes} mission${restantes > 1 ? 's' : ''} 🌿`);
    }
  }

  return (
    <div className={`task-card ${done ? 'done' : ''} ${popping ? 'popping' : ''}`}>
      <button className={`task-check ${done ? 'checked' : ''}`} onClick={handleDone} aria-label={done ? 'Annuler' : 'Marquer fait'}>
        {done ? '✓' : ''}
      </button>
      <div className="task-body" onClick={() => setMenu(!menu)}>
        <span className="task-title">{occ.title}</span>
        <span className="task-meta">
          {meta.emoji} {meta.place} · {'🌰'.repeat(occ.weight)}
        </span>
        {teammates.length > 0 && (
          <span className="task-shared">
            👥 avec {teammates.map((t) => `${t.member!.name}${t.done ? ' ✅' : ''}`).join(', ')}
          </span>
        )}
      </div>
      {popping && <span className="task-pop" aria-hidden>+{occ.weight} 🌰</span>}
      {menu && !done && (
        <div className="task-menu">
          <button
            onClick={() => {
              void moveOccurrence(occ, { date: addDays(occ.date, 1) });
              notifyInfo(`« ${occ.title} » reportée à demain ⏭️`);
              setMenu(false);
            }}
          >
            ⏭️ Demain
          </button>
          {partner && (
            <button
              onClick={() => {
                void moveOccurrence(occ, { assignee: partner.id });
                notifyInfo(`Proposée à ${partner.name} 🤝`);
                setMenu(false);
              }}
            >
              🤝 Proposer à {partner.name}
            </button>
          )}
          <button
            className="task-menu-danger"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              void deleteOccurrence(occ);
              notifyInfo(`« ${occ.title} » supprimée 🗑️`);
              setMenu(false);
            }}
          >
            🗑️ {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
          </button>
        </div>
      )}
    </div>
  );
}
