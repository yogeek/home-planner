import { useState } from 'react';
import { useStore } from '../store';
import { Creature, SPECIES } from '../components/Creature';
import { useEscape } from '../useEscape';
import type { Member } from '../types';
import './tasksettings.css';

/** Gestion des habitants du foyer (ajout, modification, retrait) */
export function MembersManager({ onClose }: { onClose: () => void }) {
  const state = useStore((s) => s.state);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  if (!state) return null;

  return (
    <div className="tset-backdrop">
      <div className="tset">
        <header className="tset-head">
          <h2>👪 Les habitants du foyer</h2>
          <button className="btn secondary tset-back" onClick={onClose}>
            ✕ Fermer
          </button>
        </header>
        <p className="muted tset-hint">
          Ajoute, modifie ou retire un habitant. Les tâches se répartissent automatiquement entre les adultes ; les
          missions « enfant » vont aux enfants.
        </p>
        <div className="tset-list">
          {state.members.map((m) => (
            <button key={m.id} className="tset-item" onClick={() => setEditing(m)}>
              <span className="tset-zone" aria-hidden>
                <Creature species={m.creature} size={30} />
              </span>
              <span className="tset-body">
                <span className="tset-title">{m.name}</span>
                <span className="tset-meta">{m.role === 'child' ? 'Enfant 🧸' : 'Adulte'}</span>
              </span>
              <span aria-hidden>›</span>
            </button>
          ))}
        </div>
        <button className="btn tset-add" onClick={() => setEditing('new')}>
          + Nouvel habitant
        </button>
      </div>
      {editing && <MemberSheet member={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function MemberSheet({ member, onClose }: { member: Member | null; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const removeMember = useStore((s) => s.removeMember);
  const [name, setName] = useState(member?.name ?? '');
  const [creature, setCreature] = useState(member?.creature ?? SPECIES[0]);
  const [role, setRole] = useState<'adult' | 'child'>(member?.role ?? 'adult');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!state) return null;
  const adults = state.members.filter((m) => m.role === 'adult');
  const isLastAdult = member?.role === 'adult' && adults.length <= 1;

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      if (member) await updateMember(member.id, { name: name.trim(), creature, role });
      else await addMember({ name: name.trim(), creature, role });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!member || busy) return;
    setBusy(true);
    try {
      await removeMember(member.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet tset-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>{member ? `Modifier ${member.name}` : 'Nouvel habitant'}</h3>

        <input className="ob-input" placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} />

        <p className="muted">Rôle :</p>
        <div className="move-row">
          <button
            className={`move-chip ${role === 'adult' ? 'active' : ''}`}
            disabled={isLastAdult}
            onClick={() => setRole('adult')}
          >
            Adulte
          </button>
          <button
            className={`move-chip ${role === 'child' ? 'active' : ''}`}
            disabled={isLastAdult}
            onClick={() => setRole('child')}
          >
            🧸 Enfant
          </button>
        </div>
        {isLastAdult && <p className="muted">C'est le seul adulte du foyer, son rôle ne peut pas changer.</p>}

        <p className="muted">Créature :</p>
        <div className="move-row wrap">
          {SPECIES.map((sp) => (
            <button
              key={sp}
              className={`move-chip ${creature === sp ? 'active' : ''}`}
              onClick={() => setCreature(sp)}
            >
              <Creature species={sp} size={28} /> {sp}
            </button>
          ))}
        </div>

        <button className="btn sheet-close" disabled={!name.trim() || busy} onClick={() => void save()}>
          {busy ? '...' : member ? 'Enregistrer' : 'Ajouter'}
        </button>
        {member && !isLastAdult && (
          <button
            className="btn ghost sheet-close tset-delete"
            disabled={busy}
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            🗑️ {confirmDelete ? 'Confirmer (ses tâches seront retirées)' : 'Retirer du foyer'}
          </button>
        )}
      </div>
    </div>
  );
}
