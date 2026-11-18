import { useEffect, useState } from 'react';
import { useStore, useMe } from '../store';
import { VillageScene, timeOfDay } from '../components/VillageScene';
import { Creature } from '../components/Creature';
import { Harvest } from '../components/Harvest';
import { GameInfo } from '../components/GameInfo';
import { GoalSheet } from '../components/GoalSheet';
import { ZONE_META, catInfo, shortDay } from '../zones';
import { LEVELS } from '@shared/village';
import { weekRecap } from '@shared/harvest';
import { dayOfWeek } from '@shared/dates';
import type { Zone } from '../types';
import { useEscape } from '../useEscape';
import './village.css';

export function Village() {
  const state = useStore((s) => s.state);
  const celebration = useStore((s) => s.celebration);
  const dayDone = useStore((s) => s.dayDone);
  const clearDayDone = useStore((s) => s.clearDayDone);
  const setTab = useStore((s) => s.setTab);
  const me = useMe();
  const [sheetZone, setSheetZone] = useState<Zone | null>(null);
  const [celebrateZone, setCelebrateZone] = useState<Zone | null>(null);
  const [showAcorn, setShowAcorn] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [recapSeen, setRecapSeen] = useState(() => localStorage.getItem('village.recapSeen') ?? '');

  useEffect(() => {
    if (!celebration) return;
    setCelebrateZone(celebration.zone);
    setShowAcorn(true);
    const t1 = setTimeout(() => setShowAcorn(false), 1300);
    const t2 = setTimeout(() => setCelebrateZone(null), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [celebration]);

  if (!state) return null;
  const { village, members } = state;
  const info = village.levelInfo;
  const nextUnlock = info.level < LEVELS.length ? LEVELS[info.level] : null;
  const time = timeOfDay(new Date(state.now));

  // Bilan : dimanche soir pour la semaine qui s'achève, lundi pour la semaine passée
  const dow = dayOfWeek(state.today);
  const hour = (new Date(state.now).getUTCHours() + 4) % 24;
  const recap =
    dow === 6 && hour >= 17
      ? { key: state.weekStart, title: 'Le bilan de la semaine', data: weekRecap(state.week, members.map((m) => m.id)), showNext: state.nextWeek.length > 0 }
      : dow === 0 && state.lastWeek.total > 0
        ? { key: state.lastWeek.weekStart, title: 'La semaine dernière', data: state.lastWeek, showNext: false }
        : null;
  const showRecap = recap && recap.key !== recapSeen && recap.data.total > 0;

  return (
    <div className={`screen village-screen sky-${time}`}>
      <div className="village-frame">
        <VillageScene
          freshness={village.freshness}
          members={members}
          unlockedCount={info.level}
          time={time}
          celebrateZone={celebrateZone}
          onZoneTap={setSheetZone}
        />
        {showAcorn && (
          <div className="acorn-fly" aria-hidden>
            🌰
          </div>
        )}
      </div>

      {state.settings.paused && (
        <div className="card village-note">
          🏖️ <strong>Le village est en vacances</strong> jusqu'au {shortDay(state.settings.pauseUntil!)} : pas de tâches
          récurrentes, et les zones ne se ternissent pas.
        </div>
      )}

      {showRecap && recap && (
        <div className="card recap-card">
          <h3>📖 {recap.title}</h3>
          <p>
            Ensemble : <strong>{recap.data.total} 🌰</strong> en <strong>{recap.data.missions}</strong> mission
            {recap.data.missions > 1 ? 's' : ''}. Merci à tous !
          </p>
          <ul className="recap-people">
            {members
              .filter((m) => (recap.data.perMember[m.id] ?? 0) > 0)
              .map((m) => (
                <li key={m.id}>
                  <Creature species={m.creature} size={26} mood="joy" /> {m.name} · {recap.data.perMember[m.id]} 🌰
                </li>
              ))}
          </ul>
          <div className="recap-actions">
            {recap.showNext && (
              <button className="btn" onClick={() => setTab('semaine')}>
                🗓️ Voir la semaine prochaine
              </button>
            )}
            <button
              className="btn secondary"
              onClick={() => {
                localStorage.setItem('village.recapSeen', recap.key);
                setRecapSeen(recap.key);
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Jauge du village */}
      <div className="card gauge-card">
        <div className="gauge-head">
          <span className="gauge-level display">Village niveau {info.level}</span>
          <div className="gauge-head-right">
            <span className="gauge-acorns display" aria-label={`${village.acorns} noisettes`}>
              🌰 {village.acorns}
            </span>
            <button className="gauge-help" onClick={() => setInfoOpen(true)} aria-label="Comment ça marche ?">
              ?
            </button>
          </div>
        </div>
        <div
          className="gauge-bar"
          role="progressbar"
          aria-valuenow={Math.round(info.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="gauge-fill" style={{ width: `${Math.max(3, info.progress * 100)}%` }} />
        </div>
        {nextUnlock ? (
          <p className="gauge-next">
            Encore <strong>{nextUnlock.cost - info.intoLevel} noisettes</strong> ensemble pour débloquer{' '}
            <strong>
              {nextUnlock.unlock} {nextUnlock.emoji}
            </strong>
          </p>
        ) : (
          <p className="gauge-next">Le village est à son apogée ! 🎆</p>
        )}
      </div>

      {/* La récolte commune : ce que chacun a apporté cette semaine */}
      <div className="card">
        <Harvest
          members={members}
          week={state.week}
          today={state.today}
          weekGlands={state.weekGlands}
          goal={state.settings.weeklyGoal}
          goalReward={state.settings.goalReward}
          onSetGoal={() => setGoalOpen(true)}
        />
      </div>

      {dayDone && me && (
        <div className="sheet-backdrop" onClick={clearDayDone}>
          <div className="sheet day-done" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Journée terminée">
            <div className="day-done-hero">
              <Creature species={me.creature} size={110} mood="joy" />
            </div>
            <h3>Journée terminée, {me.name} ! 🎉</h3>
            <p>
              Toutes tes missions du jour sont faites : <strong>+{dayDone.gained} 🌰</strong> pour le village.
            </p>
            <p className="muted">Le village te dit merci. Repose-toi bien 🌿</p>
            <button className="btn sheet-close" onClick={clearDayDone}>
              Super !
            </button>
          </div>
          <div className="confetti" aria-hidden>
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className={`confetto c${i % 6}`}
                style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {sheetZone && <ZoneSheet zone={sheetZone} onClose={() => setSheetZone(null)} />}
      {infoOpen && <GameInfo onClose={() => setInfoOpen(false)} />}
      {goalOpen && <GoalSheet onClose={() => setGoalOpen(false)} />}
    </div>
  );
}

function ZoneSheet({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  if (!state) return null;
  const meta = ZONE_META[zone];
  const tasks = state.week.filter((o) => catInfo(state.categories, o.zone).sceneZone === zone);
  const byMember = (id: string | null) => state.members.find((m) => m.id === id);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3>
          {meta.emoji} {meta.place}
        </h3>
        <p className="muted">Fraîcheur : {state.village.freshness[zone]}%</p>
        {tasks.length === 0 && <p className="muted">Rien de prévu cette semaine dans cette zone.</p>}
        <ul className="sheet-list">
          {tasks.map((t) => {
            const who = byMember(t.assignee);
            return (
              <li key={t.id} className={t.status}>
                <span className="sheet-status" aria-hidden>
                  {t.status === 'done' ? '✅' : t.status === 'skipped' ? '💤' : '⬜'}
                </span>
                <span className="sheet-title">{t.title}</span>
                <span className="sheet-who">{who ? <Creature species={who.creature} size={22} /> : '🙋'}</span>
              </li>
            );
          })}
        </ul>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
