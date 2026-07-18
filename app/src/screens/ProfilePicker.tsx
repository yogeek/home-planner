import { useStore } from '../store';
import { Creature } from '../components/Creature';
import './profilepicker.css';

/** Choix du profil sur cet appareil, façon Netflix */
export function ProfilePicker() {
  const members = useStore((s) => s.state?.members ?? []);
  const chooseMember = useStore((s) => s.chooseMember);

  return (
    <div className="picker">
      <h1>Qui es-tu ?</h1>
      <div className="picker-grid">
        {members.map((m) => (
          <button key={m.id} className="picker-card" onClick={() => chooseMember(m.id)}>
            <Creature species={m.creature} size={96} />
            <span className="picker-name">{m.name}</span>
            {m.role === 'child' && <span className="picker-tag">petit habitant</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
