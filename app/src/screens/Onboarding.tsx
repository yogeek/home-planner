import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { Creature, SPECIES } from '../components/Creature';
import type { AppState } from '../types';
import './onboarding.css';

interface Draft {
  name: string;
  creature: string;
  role: 'adult' | 'child';
}

/** Premier lancement : on fonde le village */
export function Onboarding() {
  const applyState = useStore((s) => s.applyState);
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Draft[]>([
    { name: '', creature: 'renard', role: 'adult' },
    { name: '', creature: 'chouette', role: 'adult' },
    { name: '', creature: 'panda roux', role: 'child' },
  ]);
  const [withChild, setWithChild] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = withChild ? drafts : drafts.slice(0, 2);
  const current = step >= 1 && step <= members.length ? members[step - 1] : null;

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const taken = (species: string) => members.some((m, i) => i !== step - 1 && m.creature === species);

  async function found() {
    setBusy(true);
    setError(null);
    try {
      const s = await api<AppState>('/onboard', { body: { members } });
      applyState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  }

  return (
    <div className="onboarding">
      {step === 0 && (
        <div className="ob-panel">
          <div className="ob-hero" aria-hidden>
            <Creature species="renard" size={72} mood="joy" />
            <Creature species="chouette" size={84} mood="joy" />
            <Creature species="panda roux" size={64} mood="joy" />
          </div>
          <h1>Bienvenue au Village</h1>
          <p>
            Ici, les tâches de la maison font vivre un petit village. Chaque lessive, chaque repas, chaque coin de
            jardin entretenu le rend plus beau. On le construit ensemble ?
          </p>
          <label className="ob-check">
            <input type="checkbox" checked={withChild} onChange={(e) => setWithChild(e.target.checked)} />
            Un enfant fait partie de l'aventure
          </label>
          <button className="btn" onClick={() => setStep(1)}>
            Fonder notre village
          </button>
        </div>
      )}

      {current && (
        <div className="ob-panel">
          <h2>
            {current.role === 'child' ? 'Le petit habitant' : `Habitant${step === 1 ? '' : 'e ou habitant'} n°${step}`}
          </h2>
          <input
            className="ob-input"
            placeholder={current.role === 'child' ? 'Son prénom' : 'Ton prénom'}
            value={current.name}
            autoFocus
            onChange={(e) => update(step - 1, { name: e.target.value })}
          />
          <p className="ob-label">Choisis ta créature :</p>
          <div className="ob-creatures">
            {SPECIES.map((sp) => (
              <button
                key={sp}
                className={`ob-creature ${current.creature === sp ? 'selected' : ''}`}
                disabled={taken(sp)}
                onClick={() => update(step - 1, { creature: sp })}
                aria-pressed={current.creature === sp}
              >
                <Creature species={sp} size={64} mood={current.creature === sp ? 'joy' : 'normal'} />
                <span>{sp}</span>
              </button>
            ))}
          </div>
          <div className="ob-nav">
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              Retour
            </button>
            {step < members.length ? (
              <button className="btn" disabled={!current.name.trim()} onClick={() => setStep(step + 1)}>
                Suivant
              </button>
            ) : (
              <button className="btn" disabled={!current.name.trim() || busy} onClick={found}>
                {busy ? 'Fondation...' : 'Créer le village !'}
              </button>
            )}
          </div>
          {error && <p className="ob-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
