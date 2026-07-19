import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { VillageScene, timeOfDay } from '../components/VillageScene';
import { Creature } from '../components/Creature';
import { ZONE_META } from '../zones';
import { LEVELS } from '@shared/village';
import type { Zone } from '../types';
import './village.css';
import './tablet.css';

/** Tableau de bord familial pour la tablette de la cuisine */
export function Tablet() {
  const state = useStore((s) => s.state);
  const celebration = useStore((s) => s.celebration);
  const doneOccurrence = useStore((s) => s.doneOccurrence);
  const undoOccurrence = useStore((s) => s.undoOccurrence);
  const setDashboard = useStore((s) => s.setDashboard);
  const refresh = useStore((s) => s.refresh);
  const [celebrateZone, setCelebrateZone] = useState<Zone | null>(null);

  // L'horloge du tableau : rafraîchit l'heure du ciel toutes les 10 minutes
  useEffect(() => {
    const t = setInterval(() => void refresh(), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!celebration) return;
    setCelebrateZone(celebration.zone);
    const t = setTimeout(() => setCelebrateZone(null), 2400);
    return () => clearTimeout(t);
  }, [celebration]);

  if (!state) return null;
  const { village, members } = state;
  const info = village.levelInfo;
  const nextUnlock = info.level < LEVELS.length ? LEVELS[info.level] : null;
  const time = timeOfDay(new Date());
  const openShopping = state.shopping.filter((i) => i.status === 'open');

  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className={`tablet sky-${time}`}>
      <header className="tablet-head">
        <h1>Le Village</h1>
        <span className="tablet-date">{dateFmt}</span>
        <span className="tablet-acorns display">🌰 {village.acorns} · niveau {info.level}</span>
        <button className="tablet-exit" onClick={() => setDashboard(false)} title="Revenir à l'application complète">
          ✕ Quitter le tableau
        </button>
      </header>

      <div className="tablet-grid">
        <div className="tablet-left">
          <div className="village-frame">
            <VillageScene
              freshness={village.freshness}
              members={members}
              unlockedCount={info.level}
              time={time}
              celebrateZone={celebrateZone}
              onZoneTap={() => {}}
            />
          </div>
          <div className="card gauge-card">
            <div className="gauge-bar">
              <div className="gauge-fill" style={{ width: `${Math.max(3, info.progress * 100)}%` }} />
            </div>
            {nextUnlock && (
              <p className="gauge-next">
                Prochain déblocage : <strong>{nextUnlock.unlock} {nextUnlock.emoji}</strong>{' '}
                <span className="muted">({info.intoLevel}/{nextUnlock.cost} 🌰)</span>
              </p>
            )}
          </div>
        </div>

        <div className="tablet-right">
          {members.map((m) => {
            const tasks = state.week.filter((o) => o.date === state.today && o.assignee === m.id);
            return (
              <div key={m.id} className="card tablet-member">
                <div className="tablet-member-head">
                  <Creature species={m.creature} size={40} mood={tasks.length > 0 && tasks.every((t) => t.status === 'done') ? 'joy' : 'normal'} />
                  <strong>{m.name}</strong>
                  <span className="muted">
                    {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
                  </span>
                </div>
                <ul>
                  {tasks.map((t) => (
                    <li key={t.id} className={t.status}>
                      <button
                        onClick={() => {
                          if (m.role === 'child') return;
                          if (t.status === 'todo') void doneOccurrence(t);
                          else if (t.status === 'done') void undoOccurrence(t);
                        }}
                        disabled={m.role === 'child'}
                        title={t.status === 'done' ? 'Annuler (coché par erreur ?)' : 'Marquer fait'}
                      >
                        {t.status === 'done' ? '✅' : '⬜'} {ZONE_META[t.zone].emoji} {t.title}
                      </button>
                    </li>
                  ))}
                  {tasks.length === 0 && <li className="muted">Journée libre 🍃</li>}
                </ul>
              </div>
            );
          })}

          <div className="card tablet-shopping">
            <div className="tablet-member-head">
              <span style={{ fontSize: '1.6rem' }}>🧺</span>
              <strong>Le marché</strong>
              <span className="muted">{openShopping.length}</span>
            </div>
            <ul>
              {openShopping.slice(0, 10).map((i) => (
                <li key={i.id}>• {i.label}</li>
              ))}
              {openShopping.length > 10 && <li className="muted">... et {openShopping.length - 10} de plus</li>}
              {openShopping.length === 0 && <li className="muted">Panier vide</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
