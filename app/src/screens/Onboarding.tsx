import { useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { Creature, SPECIES } from '../components/Creature';
import type { AppState } from '../types';
import './onboarding.css';

interface Draft {
  key: number;
  name: string;
  creature: string;
  role: 'adult' | 'child';
}

let seq = 1;
function nextCreature(used: string[]): string {
  return SPECIES.find((sp) => !used.includes(sp)) ?? SPECIES[used.length % SPECIES.length];
}
function makeDraft(role: 'adult' | 'child', used: string[]): Draft {
  return { key: seq++, name: '', creature: nextCreature(used), role };
}

interface Profil {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  build: () => Draft[];
}

const PROFILS: Profil[] = [
  {
    id: 'couple',
    label: 'En couple',
    emoji: '💑',
    desc: 'Deux adultes (enfants à ajouter ensuite)',
    build: () => {
      const a = makeDraft('adult', []);
      return [a, makeDraft('adult', [a.creature])];
    },
  },
  {
    id: 'solo',
    label: 'Parent solo',
    emoji: '🧑‍🍼',
    desc: 'Un adulte et ses enfants',
    build: () => {
      const a = makeDraft('adult', []);
      return [a, makeDraft('child', [a.creature])];
    },
  },
  {
    id: 'coloc',
    label: 'Colocation',
    emoji: '🏠',
    desc: 'Plusieurs adultes qui partagent',
    build: () => {
      const a = makeDraft('adult', []);
      const b = makeDraft('adult', [a.creature]);
      return [a, b, makeDraft('adult', [a.creature, b.creature])];
    },
  },
  {
    id: 'custom',
    label: 'À composer',
    emoji: '✨',
    desc: 'Je compose mon foyer librement',
    build: () => [makeDraft('adult', [])],
  },
];

/** Premier lancement : on fonde le village */
export function Onboarding() {
  const applyState = useStore((s) => s.applyState);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<Draft>) =>
    setDrafts((d) => d?.map((m) => (m.key === key ? { ...m, ...patch } : m)) ?? null);
  const remove = (key: number) => setDrafts((d) => d?.filter((m) => m.key !== key) ?? null);
  const add = (role: 'adult' | 'child') =>
    setDrafts((d) => [...(d ?? []), makeDraft(role, (d ?? []).map((m) => m.creature))]);

  const adults = drafts?.filter((m) => m.role === 'adult') ?? [];
  const canCreate = drafts != null && adults.length >= 1 && drafts.every((m) => m.name.trim());

  async function found() {
    if (!drafts) return;
    setBusy(true);
    setError(null);
    try {
      const members = drafts.map((m) => ({ name: m.name.trim(), creature: m.creature, role: m.role }));
      const s = await api<AppState>('/onboard', { body: { members } });
      applyState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setBusy(false);
    }
  }

  // Écran 0 : choix du type de foyer
  if (drafts === null) {
    return (
      <div className="onboarding">
        <div className="ob-panel">
          <div className="ob-hero" aria-hidden>
            <Creature species="renard" size={72} mood="joy" />
            <Creature species="chouette" size={84} mood="joy" />
            <Creature species="panda roux" size={64} mood="joy" />
          </div>
          <h1>Bienvenue au Village</h1>
          <p>
            Ici, les tâches de la maison font vivre un petit village. Chaque lessive, chaque repas, chaque coin de
            jardin entretenu le rend plus beau. Quel foyer construit-on ?
          </p>
          <div className="ob-profils">
            {PROFILS.map((p) => (
              <button key={p.id} className="ob-profil" onClick={() => setDrafts(p.build())}>
                <span className="ob-profil-emoji" aria-hidden>
                  {p.emoji}
                </span>
                <span className="ob-profil-label">{p.label}</span>
                <span className="ob-profil-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Écran 1 : composer les habitants
  return (
    <div className="onboarding">
      <div className="ob-panel ob-builder">
        <h2>Qui habite le village ?</h2>
        <p className="ob-label">Ajoute chaque membre du foyer, choisis son prénom et sa créature.</p>

        <div className="ob-members">
          {drafts.map((m) => (
            <div key={m.key} className="ob-member">
              <div className="ob-member-head">
                <input
                  className="ob-input ob-member-name"
                  placeholder={m.role === 'child' ? 'Prénom (enfant)' : 'Prénom'}
                  value={m.name}
                  onChange={(e) => update(m.key, { name: e.target.value })}
                />
                {drafts.length > 1 && (
                  <button className="ob-remove" onClick={() => remove(m.key)} aria-label="Retirer">
                    ✕
                  </button>
                )}
              </div>
              <div className="ob-role-row">
                <button
                  className={`ob-role ${m.role === 'adult' ? 'active' : ''}`}
                  onClick={() => update(m.key, { role: 'adult' })}
                >
                  Adulte
                </button>
                <button
                  className={`ob-role ${m.role === 'child' ? 'active' : ''}`}
                  onClick={() => update(m.key, { role: 'child' })}
                >
                  🧸 Enfant
                </button>
              </div>
              <div className="ob-creature-strip">
                {SPECIES.map((sp) => (
                  <button
                    key={sp}
                    className={`ob-creature-mini ${m.creature === sp ? 'selected' : ''}`}
                    onClick={() => update(m.key, { creature: sp })}
                    aria-label={sp}
                    aria-pressed={m.creature === sp}
                  >
                    <Creature species={sp} size={40} mood={m.creature === sp ? 'joy' : 'normal'} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="ob-add-row">
          <button className="btn secondary" onClick={() => add('adult')}>
            + Un adulte
          </button>
          <button className="btn secondary" onClick={() => add('child')}>
            + 🧸 Un enfant
          </button>
        </div>

        {adults.length === 0 && <p className="ob-error">Il faut au moins un adulte dans le foyer.</p>}
        {error && <p className="ob-error">{error}</p>}

        <div className="ob-nav">
          <button className="btn ghost" onClick={() => setDrafts(null)}>
            Retour
          </button>
          <button className="btn" disabled={!canCreate || busy} onClick={found}>
            {busy ? 'Fondation...' : 'Créer le village !'}
          </button>
        </div>
      </div>
    </div>
  );
}
