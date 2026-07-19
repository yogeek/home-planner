import { useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import type { Occurrence } from '../types';
import './childmode.css';

/** Illustration d'une mission enfant à partir de son titre */
function missionEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('jouet')) return '🧸';
  if (t.includes('chaussure')) return '👟';
  if (t.includes('plante') || t.includes('arros')) return '🪴';
  if (t.includes('table')) return '🍽️';
  if (t.includes('livre')) return '📚';
  if (t.includes('dent')) return '🪥';
  if (t.includes('pyjama') || t.includes('habill')) return '👕';
  return '⭐';
}

export function ChildMode() {
  const state = useStore((s) => s.state);
  const me = useMe();
  const setChildMode = useStore((s) => s.setChildMode);
  const chooseMember = useStore((s) => s.chooseMember);
  const doneOccurrence = useStore((s) => s.doneOccurrence);
  const [validating, setValidating] = useState<Occurrence | null>(null);
  const [party, setParty] = useState(false);

  if (!state) return null;
  const child = state.members.find((m) => m.role === 'child');
  if (!child) {
    setChildMode(false);
    return null;
  }

  const missions = state.week.filter((o) => o.date === state.today && o.assignee === child.id);
  const allDone = missions.length > 0 && missions.every((o) => o.status === 'done');
  const adults = state.members.filter((m) => m.role === 'adult');

  function exit() {
    setChildMode(false);
    if (me?.role === 'child') chooseMember('');
  }

  function validate(adultId: string) {
    if (!validating) return;
    void doneOccurrence(validating, adultId);
    setValidating(null);
    setParty(true);
    setTimeout(() => setParty(false), 2200);
  }

  return (
    <div className="child-mode">
      <button className="child-exit" onClick={exit} aria-label="Quitter le mode enfant">
        🚪
      </button>

      <div className={`child-hero ${party || allDone ? 'dance' : ''}`}>
        <Creature species={child.creature} size={130} mood={party || allDone ? 'joy' : 'normal'} />
        <h1>{allDone ? 'Bravo ' + child.name + ' ! 🎉' : 'Tes missions, ' + child.name}</h1>
      </div>

      {missions.length === 0 && (
        <p className="child-none">Pas de mission aujourd'hui. Va jouer ! 🦋</p>
      )}

      <div className="child-missions">
        {missions.map((o) => (
          <button
            key={o.id}
            className={`child-card ${o.status === 'done' ? 'done' : ''}`}
            disabled={o.status === 'done'}
            onClick={() => setValidating(o)}
          >
            <span className="child-emoji" aria-hidden>
              {missionEmoji(o.title)}
            </span>
            <span className="child-title">{o.title}</span>
            {o.status === 'done' && <span className="child-star" aria-hidden>⭐</span>}
          </button>
        ))}
      </div>

      {party && (
        <div className="confetti" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className={`confetto c${i % 6}`} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.1}s` }} />
          ))}
        </div>
      )}

      {validating && (
        <div className="sheet-backdrop" onClick={() => setValidating(null)}>
          <div className="sheet child-validate" onClick={(e) => e.stopPropagation()}>
            <h3>C'est fait ? 🌟</h3>
            <p>Un grand doit valider ta mission :</p>
            <div className="child-validators">
              {adults.map((a) => (
                <button key={a.id} className="picker-card" onClick={() => validate(a.id)}>
                  <Creature species={a.creature} size={64} />
                  <span className="picker-name">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
