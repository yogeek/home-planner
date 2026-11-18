import { useState } from 'react';
import { useStore, useMe } from '../store';
import { Creature } from '../components/Creature';
import { PinPad } from '../components/PinPad';
import { speak, speechSupported } from '../speech';
import type { Occurrence, Reward } from '../types';
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
  if (t.includes('animal') || t.includes('chat') || t.includes('chien')) return '🐾';
  if (t.includes('lit')) return '🛏️';
  return '⭐';
}

type Pending = { kind: 'validate'; occ: Occurrence; adultId: string } | { kind: 'claim'; reward: Reward } | { kind: 'exit' };

export function ChildMode({ childId }: { childId: string }) {
  const state = useStore((s) => s.state);
  const me = useMe();
  const setChildMode = useStore((s) => s.setChildMode);
  const chooseMember = useStore((s) => s.chooseMember);
  const doneOccurrence = useStore((s) => s.doneOccurrence);
  const call = useStore((s) => s.call);
  const [validating, setValidating] = useState<Occurrence | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [party, setParty] = useState(false);
  const [treasureOpen, setTreasureOpen] = useState(false);

  if (!state) return null;
  const child = state.members.find((m) => m.id === childId);
  if (!child) {
    setChildMode(null);
    return null;
  }

  const missions = state.week.filter((o) => o.date === state.today && o.assignee === child.id);
  const allDone = missions.length > 0 && missions.every((o) => o.status === 'done');
  const adults = state.members.filter((m) => m.role === 'adult');
  const hasPin = state.settings.hasPin;
  const stars = state.stars[child.id] ?? { earned: 0, spent: 0 };
  const balance = stars.earned - stars.spent;
  const nextReward = state.rewards.find((r) => r.cost > balance) ?? null;
  const affordable = state.rewards.filter((r) => r.cost <= balance);

  function celebrate() {
    setParty(true);
    setTimeout(() => setParty(false), 2200);
  }

  function exit() {
    setChildMode(null);
    if (me?.role === 'child') chooseMember('');
  }

  function validate(occ: Occurrence, adultId: string) {
    void doneOccurrence(occ, adultId);
    setValidating(null);
    setPending(null);
    celebrate();
    const left = missions.filter((o) => o.status === 'todo' && o.id !== occ.id).length;
    speak(left === 0 ? `Bravo ${child!.name} ! Tout est fait !` : `Bravo ! Encore ${left} mission${left > 1 ? 's' : ''}.`);
  }

  async function claim(reward: Reward, pin?: string) {
    setPending(null);
    const ok = await call(`/rewards/${reward.id}/claim`, { memberId: child!.id, pin });
    if (ok) {
      celebrate();
      speak(`Youpi ! ${reward.title} !`);
    }
  }

  function readAll() {
    if (missions.length === 0) return speak(`Pas de mission aujourd'hui, ${child!.name}. Va jouer !`);
    const todo = missions.filter((o) => o.status === 'todo');
    if (todo.length === 0) return speak(`Bravo ${child!.name}, tout est fait !`);
    speak(`${child!.name}, tes missions : ${todo.map((o) => o.title).join(', puis, ')}.`);
  }

  return (
    <div className="child-mode">
      <div className="child-top">
        <button
          className="child-exit"
          onClick={() => (hasPin ? setPending({ kind: 'exit' }) : exit())}
          aria-label="Quitter le mode enfant"
        >
          🚪
        </button>
        {speechSupported() && (
          <button className="child-speak-all" onClick={readAll} aria-label="Écouter mes missions">
            🔊
          </button>
        )}
      </div>

      <div className={`child-hero ${party || allDone ? 'dance' : ''}`}>
        <Creature species={child.creature} size={130} mood={party || allDone ? 'joy' : 'normal'} />
        <h1>{allDone ? 'Bravo ' + child.name + ' ! 🎉' : 'Tes missions, ' + child.name}</h1>
      </div>

      {missions.length === 0 && <p className="child-none">Pas de mission aujourd'hui. Va jouer ! 🦋</p>}

      <div className="child-missions">
        {missions.map((o) => (
          <div key={o.id} className={`child-card ${o.status === 'done' ? 'done' : ''}`}>
            <button
              className="child-card-main"
              disabled={o.status === 'done'}
              onClick={() => {
                setValidating(o);
                speak(`${o.title}. C'est fait ? Va chercher un grand !`);
              }}
            >
              <span className="child-emoji" aria-hidden>
                {missionEmoji(o.title)}
              </span>
              <span className="child-title">{o.title}</span>
              {o.status === 'done' && (
                <span className="child-star" aria-hidden>
                  ⭐
                </span>
              )}
            </button>
            {speechSupported() && (
              <button className="child-speak" onClick={() => speak(o.title)} aria-label={`Écouter : ${o.title}`}>
                🔊
              </button>
            )}
          </div>
        ))}
      </div>

      {/* La tirelire : les noisettes gagnées se transforment en vraies récompenses */}
      <button className="child-treasure" onClick={() => setTreasureOpen(true)}>
        <span className="child-treasure-count display">🌰 {balance}</span>
        <span className="child-treasure-label">
          {nextReward ? (
            <>
              Encore {nextReward.cost - balance} pour {nextReward.emoji} {nextReward.title}
            </>
          ) : affordable.length > 0 ? (
            <>Tu peux choisir une récompense ! 🎁</>
          ) : (
            <>Ma tirelire</>
          )}
        </span>
        {nextReward && (
          <span className="child-treasure-bar" aria-hidden>
            <span style={{ width: `${Math.min(100, (balance / nextReward.cost) * 100)}%` }} />
          </span>
        )}
      </button>

      {party && (
        <div className="confetti" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className={`confetto c${i % 6}`}
              style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.1}s` }}
            />
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
                <button
                  key={a.id}
                  className="picker-card"
                  onClick={() => (hasPin ? setPending({ kind: 'validate', occ: validating, adultId: a.id }) : validate(validating, a.id))}
                >
                  <Creature species={a.creature} size={64} />
                  <span className="picker-name">{a.name}</span>
                </button>
              ))}
            </div>
            <button className="btn secondary sheet-close" onClick={() => setValidating(null)}>
              Pas encore
            </button>
          </div>
        </div>
      )}

      {treasureOpen && (
        <div className="sheet-backdrop" onClick={() => setTreasureOpen(false)}>
          <div className="sheet child-validate" onClick={(e) => e.stopPropagation()}>
            <h3>Ma tirelire : 🌰 {balance}</h3>
            {state.rewards.length === 0 && (
              <p className="muted">Demande à un grand d'ajouter des récompenses (dans Plus → Récompenses).</p>
            )}
            <ul className="child-rewards">
              {state.rewards.map((r) => (
                <li key={r.id} className={r.cost <= balance ? 'ok' : ''}>
                  <span className="child-reward-emoji" aria-hidden>
                    {r.emoji}
                  </span>
                  <span className="child-reward-title">{r.title}</span>
                  {r.cost <= balance ? (
                    <button
                      className="btn"
                      onClick={() => {
                        setTreasureOpen(false);
                        if (hasPin) setPending({ kind: 'claim', reward: r });
                        else void claim(r);
                      }}
                    >
                      Je la veux ! ({r.cost} 🌰)
                    </button>
                  ) : (
                    <span className="muted">{r.cost} 🌰</span>
                  )}
                </li>
              ))}
            </ul>
            {state.claims.filter((c) => c.memberId === child.id).length > 0 && (
              <p className="muted">
                Déjà obtenues :{' '}
                {state.claims
                  .filter((c) => c.memberId === child.id)
                  .slice(0, 5)
                  .map((c) => `${c.emoji} ${c.title}`)
                  .join(' · ')}
              </p>
            )}
            <button className="btn secondary sheet-close" onClick={() => setTreasureOpen(false)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {pending && (
        <PinPad
          title={pending.kind === 'exit' ? 'Sortir du mode enfant' : pending.kind === 'claim' ? 'Valider la récompense' : 'Valider la mission'}
          onClose={() => setPending(null)}
          onSuccess={(pin) => {
            if (pending.kind === 'exit') exit();
            else if (pending.kind === 'validate') validate(pending.occ, pending.adultId);
            else void claim(pending.reward, pin);
          }}
        />
      )}
    </div>
  );
}
