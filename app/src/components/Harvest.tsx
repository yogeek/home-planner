import type { Member, Occurrence } from '../types';
import { harvestMessage } from '@shared/harvest';
import { MEMBER_PALETTE } from '../zones';
import { Creature } from './Creature';
import './harvest.css';

/** Couleur stable et bien distincte de chaque habitant (selon son ordre dans le foyer) */
export function memberColor(members: Member[], id: string): string {
  const i = members.findIndex((m) => m.id === id);
  return MEMBER_PALETTE[(i < 0 ? 0 : i) % MEMBER_PALETTE.length];
}

interface Props {
  members: Member[];
  week: Occurrence[];
  today: string;
  weekGlands: Record<string, number>;
  goal: number | null;
  goalReward: string | null;
  onSetGoal?: () => void;
}

/** La récolte commune : la contribution de chacun dans une même semaine partagée, et l'objectif de la famille */
export function Harvest({ members, week, today, weekGlands, goal, goalReward, onSetGoal }: Props) {
  const contribs = members.map((m) => ({ m, g: weekGlands[m.id] ?? 0 }));
  const total = contribs.reduce((s, c) => s + c.g, 0);
  const reached = goal != null && total >= goal;

  return (
    <div className="harvest">
      <p className="harvest-title display">🌳 Notre semaine au village</p>

      {goal != null ? (
        <div className={`harvest-goal ${reached ? 'reached' : ''}`}>
          <span className="display">
            {reached ? '🎉 Objectif atteint !' : `🎯 Objectif : ${total} / ${goal} 🌰`}
            {goalReward ? ` → ${goalReward}` : ''}
          </span>
          <div className="harvest-goal-bar" role="progressbar" aria-valuenow={Math.min(total, goal)} aria-valuemin={0} aria-valuemax={goal}>
            <div style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
          </div>
        </div>
      ) : (
        onSetGoal && (
          <button className="harvest-setgoal" onClick={onSetGoal}>
            🎯 Se fixer un objectif de famille (et une récompense)
          </button>
        )
      )}

      <div className="harvest-bar" role="img" aria-label={`Contribution de chacun : ${contribs.map((c) => `${c.m.name} ${c.g}`).join(', ')}`}>
        {total === 0 ? (
          <div className="harvest-empty" />
        ) : (
          contribs
            .filter((c) => c.g > 0)
            .map((c) => (
              <div
                key={c.m.id}
                className="harvest-seg"
                style={{ width: `${(c.g / total) * 100}%`, background: memberColor(members, c.m.id) }}
                title={`${c.m.name} : ${c.g} 🌰`}
              />
            ))
        )}
      </div>

      <div className="harvest-people">
        {contribs.map((c) => (
          <div key={c.m.id} className="harvest-person">
            <span className="harvest-dot" style={{ background: memberColor(members, c.m.id) }} aria-hidden />
            <Creature species={c.m.creature} size={30} mood={c.g > 0 ? 'joy' : 'normal'} />
            <span className="harvest-name">{c.m.name}</span>
            <span className="harvest-glands">{c.g} 🌰</span>
          </div>
        ))}
      </div>

      {total > 0 && (
        <p className="harvest-total">
          Ensemble : <strong>{total} 🌰</strong> cette semaine 🌱
        </p>
      )}
      <p className="harvest-hint muted">{harvestMessage(members, week, today)}</p>
    </div>
  );
}
