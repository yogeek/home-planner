import { useState } from 'react';
import { useStore } from '../store';
import { useEscape } from '../useEscape';

/** Objectif de noisettes de la famille pour la semaine, et la récompense promise */
export function GoalSheet({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  const call = useStore((s) => s.call);
  const notifyInfo = useStore((s) => s.notifyInfo);
  // Suggestion : 80 % de ce qui est prévu cette semaine, arrondi à 10
  const planned = state?.week.reduce((n, o) => n + o.weight, 0) ?? 0;
  const suggested = Math.max(20, Math.round((planned * 0.8) / 10) * 10);
  const [goal, setGoal] = useState(state?.settings.weeklyGoal ?? suggested);
  const [reward, setReward] = useState(state?.settings.goalReward ?? '');
  if (!state) return null;

  async function save(g: number | null) {
    if (await call('/settings', { weeklyGoal: g ?? 0, goalReward: g ? reward : '' }, 'PUT')) {
      notifyInfo(g ? `Objectif : ${g} 🌰 cette semaine 🎯` : 'Objectif retiré');
      onClose();
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>🎯 L'objectif de la famille</h3>
        <p className="muted">
          Combien de noisettes ensemble cette semaine ? Cette semaine, {planned} 🌰 sont prévues : on vous suggère {suggested}.
        </p>
        <div className="move-row wrap">
          {[...new Set([Math.round(suggested * 0.75), suggested, Math.round(suggested * 1.25)])].map((g) => (
            <button key={g} aria-pressed={goal === g} className={`move-chip ${goal === g ? 'active' : ''}`} onClick={() => setGoal(g)}>
              {g} 🌰
            </button>
          ))}
          <label className="move-chip tset-date">
            autre :
            <input
              type="number"
              min={1}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 1))}
              style={{ width: 64 }}
              aria-label="Objectif de noisettes"
            />
          </label>
        </div>
        <p className="muted">La récompense si on y arrive :</p>
        <input
          className="ob-input"
          placeholder="ex : soirée pizza 🍕, sortie plage, film en famille"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          maxLength={80}
        />
        <button className="btn sheet-close" onClick={() => void save(goal)}>
          C'est parti !
        </button>
        {state.settings.weeklyGoal && (
          <button className="btn ghost sheet-close" style={{ color: 'var(--encre-douce)' }} onClick={() => void save(null)}>
            Retirer l'objectif
          </button>
        )}
      </div>
    </div>
  );
}
