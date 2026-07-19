import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { VillageScene, timeOfDay } from '../components/VillageScene';
import { Creature } from '../components/Creature';
import { Harvest } from '../components/Harvest';
import { ZONE_META, catInfo } from '../zones';
import { LEVELS } from '@shared/village';
import type { Zone } from '../types';
import { useEscape } from '../useEscape';
import './village.css';

export function Village() {
  const state = useStore((s) => s.state);
  const celebration = useStore((s) => s.celebration);
  const [sheetZone, setSheetZone] = useState<Zone | null>(null);
  const [celebrateZone, setCelebrateZone] = useState<Zone | null>(null);
  const [showAcorn, setShowAcorn] = useState(false);

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
        {showAcorn && <div className="acorn-fly" aria-hidden>🌰</div>}
      </div>

      {/* Jauge du village */}
      <div className="card gauge-card">
        <div className="gauge-head">
          <span className="gauge-level display">Village niveau {info.level}</span>
          <span className="gauge-acorns display" aria-label={`${village.acorns} glands`}>
            🌰 {village.acorns}
          </span>
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
            Prochain déblocage :{' '}
            <strong>
              {nextUnlock.unlock} {nextUnlock.emoji}
            </strong>
            <span className="muted">
              {' '}
              ({info.intoLevel}/{nextUnlock.cost} 🌰)
            </span>
          </p>
        ) : (
          <p className="gauge-next">Le village est à son apogée ! 🎆</p>
        )}
      </div>

      {/* La récolte commune : ce que chacun a apporté cette semaine */}
      <div className="card">
        <Harvest members={members} weekGlands={state.weekGlands} />
      </div>

      {sheetZone && <ZoneSheet zone={sheetZone} onClose={() => setSheetZone(null)} />}
    </div>
  );
}

function ZoneSheet({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  useEscape(onClose);
  const state = useStore((s) => s.state);
  if (!state) return null;
  const meta = ZONE_META[zone];
  const tasks = state.week.filter((o) => catInfo(state.categories, o.zone).sceneZone === zone);
  const byMember = (id: string) => state.members.find((m) => m.id === id);

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
          {tasks.map((t) => (
            <li key={t.id} className={t.status}>
              <span className="sheet-status" aria-hidden>
                {t.status === 'done' ? '✅' : t.status === 'skipped' ? '💤' : '⬜'}
              </span>
              <span className="sheet-title">{t.title}</span>
              <span className="sheet-who">
                {byMember(t.assignee) && <Creature species={byMember(t.assignee)!.creature} size={22} />}
              </span>
            </li>
          ))}
        </ul>
        <button className="btn secondary sheet-close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
