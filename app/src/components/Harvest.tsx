import type { Member } from '../types';
import { Creature } from './Creature';
import './harvest.css';

/** Message d'entraide bienveillant selon les contributions des adultes */
export function harvestMessage(members: Member[], weekGlands: Record<string, number>): string {
  const adults = members.filter((m) => m.role === 'adult');
  const total = members.reduce((s, m) => s + (weekGlands[m.id] ?? 0), 0);
  if (total === 0) return 'La semaine commence : première mission cochée, premier gland ! 🌱';

  if (adults.length <= 1) {
    const a = adults[0];
    const g = a ? (weekGlands[a.id] ?? 0) : 0;
    const kids = members.filter((m) => m.role === 'child' && (weekGlands[m.id] ?? 0) > 0);
    const kidNote = kids.length ? `, et ${kids.map((k) => k.name).join(' et ')} donne un coup de main 🧸` : '';
    return `Bravo ${a?.name ?? ''}, ${g} 🌰 cette semaine${kidNote} !`;
  }

  const sorted = adults.map((a) => ({ a, g: weekGlands[a.id] ?? 0 })).sort((x, y) => y.g - x.g);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];
  const mean = sorted.reduce((s, x) => s + x.g, 0) / sorted.length;
  if (top.g - low.g >= 5 && top.g >= mean * 1.4) {
    return `💛 ${top.a.name} a bien porté cette semaine, un coup de main lui ferait plaisir`;
  }
  return "Bel élan collectif, bravo l'équipe ! 💚";
}

/** La récolte commune : la contribution de chacun dans une même semaine partagée */
export function Harvest({ members, weekGlands }: { members: Member[]; weekGlands: Record<string, number> }) {
  const contribs = members.map((m) => ({ m, g: weekGlands[m.id] ?? 0 }));
  const total = contribs.reduce((s, c) => s + c.g, 0);

  return (
    <div className="harvest">
      <p className="harvest-title display">🌳 Notre semaine au village</p>

      <div className="harvest-bar" role="img" aria-label="Contribution de chacun cette semaine">
        {total === 0 ? (
          <div className="harvest-empty" />
        ) : (
          contribs
            .filter((c) => c.g > 0)
            .map((c) => (
              <div
                key={c.m.id}
                className="harvest-seg"
                style={{ width: `${(c.g / total) * 100}%`, background: c.m.color }}
                title={`${c.m.name} : ${c.g} 🌰`}
              />
            ))
        )}
      </div>

      <div className="harvest-people">
        {contribs.map((c) => (
          <div key={c.m.id} className="harvest-person">
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
      <p className="harvest-hint muted">{harvestMessage(members, weekGlands)}</p>
    </div>
  );
}
