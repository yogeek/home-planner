import type { Member, Zone } from '../types';
import { Creature } from './Creature';

export type TimeOfDay = 'aube' | 'jour' | 'crepuscule' | 'nuit';

export function timeOfDay(date: Date): TimeOfDay {
  // Heure locale Réunion (UTC+4)
  const h = (date.getUTCHours() + 4) % 24;
  if (h >= 5 && h < 8) return 'aube';
  if (h >= 8 && h < 17) return 'jour';
  if (h >= 17 && h < 19) return 'crepuscule';
  return 'nuit';
}

const SKIES: Record<TimeOfDay, [string, string, string]> = {
  aube: ['#2e4a5e', '#c9856f', '#f2c98e'],
  jour: ['#7db4d8', '#a8cde4', '#d8ecf4'],
  crepuscule: ['#3b3457', '#a05a68', '#e8a548'],
  nuit: ['#0d1b2a', '#16302e', '#1f3a33'],
};

interface Props {
  freshness: Record<Zone, number>;
  members: Member[];
  unlockedCount: number;
  time: TimeOfDay;
  celebrateZone: Zone | null;
  onZoneTap: (z: Zone) => void;
}

/** Groupe de zone : la fraîcheur pilote saturation et opacité */
function ZoneG({
  zone,
  freshness,
  celebrate,
  onTap,
  label,
  children,
}: {
  zone: Zone;
  freshness: number;
  celebrate: boolean;
  onTap: (z: Zone) => void;
  label: string;
  children: React.ReactNode;
}) {
  const f = freshness / 100;
  return (
    <g
      className={`vz ${celebrate ? 'vz-celebrate' : ''}`}
      style={{ filter: `saturate(${0.45 + 0.55 * f})`, opacity: 0.62 + 0.38 * f }}
      onClick={() => onTap(zone)}
      role="button"
      aria-label={label}
    >
      {children}
    </g>
  );
}

/** Petite maison d'habitant avec sa créature devant */
function House({ x, y, color, creature, name, scale = 1 }: { x: number; y: number; color: string; creature: string; name: string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-16" y="-14" width="32" height="24" rx="3" fill="#e9dcc3" stroke="#b9a686" strokeWidth="1" />
      <path d="M-20 -12 L0 -30 L20 -12 Z" fill={color} />
      <rect x="-5" y="-2" width="10" height="12" rx="2" fill="#7a5c3e" />
      <circle cx="9" cy="-4" r="3.4" fill="#fdf3da" stroke="#b9a686" strokeWidth="0.8" />
      <foreignObject x="-30" y="-6" width="22" height="24">
        <Creature species={creature} size={21} />
      </foreignObject>
      <text x="0" y="18" textAnchor="middle" fontSize="6.4" fill="#3c4f47" fontFamily="Fredoka" opacity="0.85">
        {name}
      </text>
    </g>
  );
}

/** Décorations débloquées par niveau, disséminées dans la scène */
const DECOR: { x: number; y: number; emoji: string; size: number }[] = [
  { x: 208, y: 156, emoji: '🌼', size: 9 },
  { x: 236, y: 140, emoji: '🏮', size: 9 },
  { x: 172, y: 148, emoji: '🪑', size: 8 },
  { x: 222, y: 168, emoji: '⛲', size: 13 },
  { x: 118, y: 190, emoji: '🥕', size: 8 },
  { x: 274, y: 196, emoji: '🌉', size: 12 },
  { x: 96, y: 132, emoji: '🐝', size: 8 },
  { x: 60, y: 108, emoji: '🌬️', size: 12 },
  { x: 320, y: 120, emoji: '🐻', size: 11 },
  { x: 348, y: 148, emoji: '🍎', size: 9 },
  { x: 36, y: 140, emoji: '🛖', size: 11 },
  { x: 190, y: 120, emoji: '✨', size: 9 },
  { x: 254, y: 120, emoji: '🎻', size: 9 },
  { x: 130, y: 60, emoji: '🎈', size: 12 },
  { x: 356, y: 186, emoji: '🗼', size: 11 },
  { x: 302, y: 168, emoji: '🎪', size: 11 },
  { x: 60, y: 50, emoji: '🌌', size: 12 },
  { x: 200, y: 96, emoji: '🎆', size: 13 },
];

export function VillageScene({ freshness, members, unlockedCount, time, celebrateZone, onZoneTap }: Props) {
  const [skyTop, skyMid, skyLow] = SKIES[time];
  const night = time === 'nuit';
  const adults = members.filter((m) => m.role === 'adult');
  const child = members.find((m) => m.role === 'child');
  const fJardin = freshness.jardin ?? 55;
  const fPiscine = freshness.piscine ?? 55;

  return (
    <svg viewBox="0 0 400 260" className="village-scene" role="img" aria-label="Le village de la famille">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="0.55" stopColor={skyMid} />
          <stop offset="1" stopColor={skyLow} />
        </linearGradient>
        <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#22423a' : '#7ba883'} />
          <stop offset="1" stopColor={night ? '#1b352e' : '#5f8f6b'} />
        </linearGradient>
        <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#2b5045' : '#8fbc8f'} />
          <stop offset="1" stopColor={night ? '#234438' : '#6ea376'} />
        </linearGradient>
        <radialGradient id="pond" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor={night ? '#3d6b8a' : '#9fd4e8'} />
          <stop offset="1" stopColor={night ? '#2a4d66' : '#6fb5d4'} />
        </radialGradient>
      </defs>

      {/* Ciel */}
      <rect width="400" height="260" fill="url(#sky)" />
      {night && (
        <g className="stars" fill="#f4e9c9">
          {[
            [30, 24], [74, 48], [120, 18], [168, 40], [214, 22], [258, 52], [304, 16], [342, 42], [382, 26], [52, 70], [200, 64], [366, 66],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} className={`star s${i % 4}`} />
          ))}
        </g>
      )}
      {time === 'jour' && <circle cx="330" cy="42" r="18" fill="#fbe9a8" opacity="0.95" />}
      {time === 'aube' && <circle cx="330" cy="60" r="16" fill="#f8c97e" />}
      {time === 'crepuscule' && <circle cx="70" cy="58" r="15" fill="#f2a65e" />}
      {night && (
        <g>
          <circle cx="330" cy="44" r="14" fill="#f4e9c9" />
          <circle cx="325" cy="40" r="12" fill={skyTop} opacity="0.75" />
        </g>
      )}

      {/* Collines */}
      <path d="M0 132 Q80 96 170 122 Q270 148 400 110 L400 260 L0 260 Z" fill="url(#hillFar)" />
      <path d="M0 178 Q110 146 220 168 Q320 188 400 164 L400 260 L0 260 Z" fill="url(#hillNear)" />

      {/* Sentier central */}
      <path d="M200 260 Q196 220 200 196 Q204 176 210 162" stroke={night ? '#4a4234' : '#d9c9a3'} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Décorations débloquées */}
      {DECOR.slice(0, unlockedCount).map((d, i) => (
        <text key={i} x={d.x} y={d.y} fontSize={d.size} textAnchor="middle" className="decor">
          {d.emoji}
        </text>
      ))}

      {/* Maisons des habitants */}
      {adults[0] && <House x={156} y={138} color="#c96f4a" creature={adults[0].creature} name={adults[0].name} />}
      {adults[1] && <House x={248} y={134} color="#8b6fae" creature={adults[1].creature} name={adults[1].name} />}
      {child && <House x={202} y={146} color="#6e9075" creature={child.creature} name={child.name} scale={0.72} />}

      {/* --- Zone : potager (jardin) --- */}
      <ZoneG zone="jardin" freshness={fJardin} celebrate={celebrateZone === 'jardin'} onTap={onZoneTap} label="Le potager">
        <ellipse cx="92" cy="206" rx="52" ry="20" fill={night ? '#4d3d2c' : '#8a6a45'} />
        {[0, 1, 2].map((r) => (
          <path key={r} d={`M52 ${198 + r * 7} Q92 ${192 + r * 7} 132 ${198 + r * 7}`} stroke={night ? '#3a2e21' : '#6e5233'} strokeWidth="2.4" fill="none" />
        ))}
        {fJardin > 40 &&
          [60, 76, 92, 108, 124].map((x, i) => (
            <g key={i} className="plant">
              <line x1={x} y1={196 + (i % 3) * 7} x2={x} y2={190 + (i % 3) * 7} stroke="#4e7d55" strokeWidth="1.8" />
              <circle cx={x} cy={188 + (i % 3) * 7} r={fJardin > 70 ? 3.2 : 2.2} fill={['#e8a548', '#d97b93', '#7fa8c9', '#e8a548', '#c96f4a'][i]} />
            </g>
          ))}
        {fJardin <= 40 && (
          <g stroke="#7d8a5e" strokeWidth="1.4" opacity="0.8">
            <path d="M64 200 q2 -8 -2 -12" fill="none" />
            <path d="M96 204 q-3 -7 1 -13" fill="none" />
            <path d="M120 198 q2 -8 -3 -11" fill="none" />
          </g>
        )}
        <text x="92" y="238" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          Le potager
        </text>
      </ZoneG>

      {/* --- Zone : la source (piscine) --- */}
      <ZoneG zone="piscine" freshness={fPiscine} celebrate={celebrateZone === 'piscine'} onTap={onZoneTap} label="La source">
        <ellipse cx="322" cy="212" rx="46" ry="19" fill="url(#pond)" />
        <ellipse cx="322" cy="212" rx="46" ry="19" fill="none" stroke={night ? '#4a7a99' : '#b9e2f2'} strokeWidth="2" opacity="0.7" />
        {fPiscine > 55 && (
          <g className="ripples" stroke={night ? '#6fa3c4' : '#ffffff'} strokeWidth="1.1" fill="none" opacity="0.6">
            <ellipse cx="310" cy="208" rx="9" ry="3" />
            <ellipse cx="336" cy="216" rx="6" ry="2.2" />
          </g>
        )}
        {fPiscine <= 55 && (
          <g fill="#7d9a5e" opacity="0.75">
            <ellipse cx="308" cy="207" rx="6" ry="2" />
            <ellipse cx="332" cy="217" rx="8" ry="2.4" />
            <ellipse cx="322" cy="211" rx="4" ry="1.6" />
          </g>
        )}
        <path d="M282 224 q6 -10 14 -12" stroke="#8a6a45" strokeWidth="3" fill="none" strokeLinecap="round" />
        <text x="322" y="244" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          La source
        </text>
      </ZoneG>

      {/* --- Zone : le lavoir (lessive) --- */}
      <ZoneG zone="lessive" freshness={freshness.lessive ?? 55} celebrate={celebrateZone === 'lessive'} onTap={onZoneTap} label="Le lavoir">
        <rect x="24" y="150" width="34" height="22" rx="3" fill="#cbb896" />
        <path d="M18 152 L41 136 L64 152 Z" fill="#a8794f" />
        <rect x="34" y="158" width="14" height="14" rx="2" fill="#6f89a3" opacity="0.9" />
        {(freshness.lessive ?? 55) > 50 && (
          <g className="smoke" fill={night ? '#9fb4ac' : '#ffffff'} opacity="0.7">
            <circle cx="58" cy="132" r="3" className="puff p0" />
            <circle cx="61" cy="124" r="4" className="puff p1" />
            <circle cx="65" cy="115" r="5" className="puff p2" />
          </g>
        )}
        <line x1="64" y1="152" x2="94" y2="146" stroke="#7a5c3e" strokeWidth="1.4" />
        {[70, 79, 88].map((x, i) => (
          <rect key={i} x={x} y={148 - i * 1.2} width="6" height="8" rx="1" fill={['#e8a548', '#7fa8c9', '#d97b93'][i]} className="linge" />
        ))}
        <text x="46" y="184" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          Le lavoir
        </text>
      </ZoneG>

      {/* --- Zone : la grande table (cuisine) --- */}
      <ZoneG zone="cuisine" freshness={freshness.cuisine ?? 55} celebrate={celebrateZone === 'cuisine'} onTap={onZoneTap} label="La grande table">
        <ellipse cx="196" cy="216" rx="34" ry="12" fill={night ? '#3f5747' : '#7fae86'} opacity="0.6" />
        <rect x="172" y="204" width="48" height="7" rx="3" fill="#a8794f" />
        <rect x="176" y="211" width="4" height="9" fill="#8a6a45" />
        <rect x="212" y="211" width="4" height="9" fill="#8a6a45" />
        {(freshness.cuisine ?? 55) > 50 && (
          <g>
            <circle cx="186" cy="201" r="3" fill="#e9dcc3" />
            <circle cx="198" cy="200" r="3.4" fill="#d97b93" />
            <circle cx="209" cy="201" r="3" fill="#e8a548" />
          </g>
        )}
        <text x="196" y="238" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          La grande table
        </text>
      </ZoneG>

      {/* --- Zone : le marché (courses) --- */}
      <ZoneG zone="courses" freshness={freshness.courses ?? 55} celebrate={celebrateZone === 'courses'} onTap={onZoneTap} label="Le marché">
        <rect x="286" y="152" width="40" height="4" fill="#8a6a45" />
        <path d="M282 152 L330 152 L326 142 L286 142 Z" fill="#c96f4a" />
        <path d="M282 152 L330 152 L326 142 L286 142 Z" fill="url(#awn)" />
        <defs>
          <pattern id="awn" width="8" height="12" patternUnits="userSpaceOnUse">
            <rect width="4" height="12" fill="#fdf3da" opacity="0.85" />
          </pattern>
        </defs>
        <rect x="288" y="156" width="6" height="14" fill="#8a6a45" />
        <rect x="318" y="156" width="6" height="14" fill="#8a6a45" />
        {(freshness.courses ?? 55) > 50 && (
          <g>
            <circle cx="296" cy="149" r="2.6" fill="#e8a548" />
            <circle cx="303" cy="148" r="2.6" fill="#d9714e" />
            <circle cx="310" cy="149" r="2.6" fill="#7fa8c9" />
          </g>
        )}
        <text x="306" y="182" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          Le marché
        </text>
      </ZoneG>

      {/* --- Zone : l'atelier (rangement) --- */}
      <ZoneG zone="rangement" freshness={freshness.rangement ?? 55} celebrate={celebrateZone === 'rangement'} onTap={onZoneTap} label="L'atelier">
        <rect x="118" y="152" width="30" height="20" rx="3" fill="#b9a686" />
        <path d="M113 154 L133 140 L153 154 Z" fill="#6e9075" />
        <rect x="126" y="158" width="9" height="14" rx="1.5" fill="#7a5c3e" />
        <circle cx="142" cy="162" r="3" fill="#fdf3da" />
        <g stroke="#7a5c3e" strokeWidth="1.6" strokeLinecap="round">
          <path d="M152 168 L158 156" />
          <path d="M156 168 L150 158" />
        </g>
        <text x="133" y="184" textAnchor="middle" fontSize="7.4" fill={night ? '#cfd8c4' : '#33493d'} fontFamily="Fredoka">
          L'atelier
        </text>
      </ZoneG>

      {/* Lucioles la nuit */}
      {night && (
        <g fill="#f6d989">
          {[
            [140, 200], [230, 190], [180, 170], [290, 200], [90, 170],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" className={`firefly f${i}`} />
          ))}
        </g>
      )}
    </svg>
  );
}
