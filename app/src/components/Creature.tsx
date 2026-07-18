interface Props {
  species: string;
  size?: number;
  mood?: 'normal' | 'joy';
  className?: string;
}

/** Les yeux : ronds ou fermés de joie (^ ^) */
function Eyes({ joy, y = 52 }: { joy: boolean; y?: number }) {
  if (joy) {
    return (
      <g stroke="#26332e" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d={`M31 ${y} q6 -7 12 0`} />
        <path d={`M57 ${y} q6 -7 12 0`} />
      </g>
    );
  }
  return (
    <g fill="#26332e">
      <circle cx="37" cy={y} r="4.6" />
      <circle cx="63" cy={y} r="4.6" />
      <circle cx="38.6" cy={y - 1.6} r="1.5" fill="#fff" />
      <circle cx="64.6" cy={y - 1.6} r="1.5" fill="#fff" />
    </g>
  );
}

function Blush() {
  return (
    <g fill="#e78a67" opacity="0.45">
      <ellipse cx="26" cy="63" rx="6" ry="3.6" />
      <ellipse cx="74" cy="63" rx="6" ry="3.6" />
    </g>
  );
}

function Renard({ joy }: { joy: boolean }) {
  return (
    <>
      <path d="M18 34 L10 12 Q24 14 32 24 Z" fill="#d9714e" />
      <path d="M82 34 L90 12 Q76 14 68 24 Z" fill="#d9714e" />
      <path d="M20 31 L15 17 Q24 19 29 25 Z" fill="#8a4631" />
      <path d="M80 31 L85 17 Q76 19 71 25 Z" fill="#8a4631" />
      <ellipse cx="50" cy="55" rx="35" ry="32" fill="#e08155" />
      <path d="M50 87 Q26 87 19 68 Q28 76 50 76 Q72 76 81 68 Q74 87 50 87Z" fill="#fbe9d8" />
      <Eyes joy={joy} />
      <ellipse cx="50" cy="66" rx="5.4" ry="4.2" fill="#3d2a20" />
      <Blush />
    </>
  );
}

function Chouette({ joy }: { joy: boolean }) {
  return (
    <>
      <path d="M22 28 L14 12 L34 20 Z" fill="#8b6fae" />
      <path d="M78 28 L86 12 L66 20 Z" fill="#8b6fae" />
      <ellipse cx="50" cy="56" rx="35" ry="33" fill="#9d83bd" />
      <circle cx="37" cy="52" r="13" fill="#f4ecfa" />
      <circle cx="63" cy="52" r="13" fill="#f4ecfa" />
      <Eyes joy={joy} />
      <path d="M50 60 L44 68 Q50 73 56 68 Z" fill="#e8a548" />
      <path d="M28 80 Q40 88 50 88 Q60 88 72 80 Q64 92 50 92 Q36 92 28 80Z" fill="#8b6fae" />
      <Blush />
    </>
  );
}

function PandaRoux({ joy }: { joy: boolean }) {
  return (
    <>
      <circle cx="24" cy="26" r="12" fill="#c0563b" />
      <circle cx="76" cy="26" r="12" fill="#c0563b" />
      <circle cx="24" cy="26" r="6.5" fill="#f6e3d0" />
      <circle cx="76" cy="26" r="6.5" fill="#f6e3d0" />
      <ellipse cx="50" cy="56" rx="35" ry="32" fill="#cc6844" />
      <path d="M28 44 Q22 38 15 40 Q22 50 30 50 Z" fill="#f6e3d0" />
      <path d="M72 44 Q78 38 85 40 Q78 50 70 50 Z" fill="#f6e3d0" />
      <path d="M50 88 Q30 88 23 70 Q34 78 50 78 Q66 78 77 70 Q70 88 50 88Z" fill="#f6e3d0" />
      <Eyes joy={joy} />
      <ellipse cx="50" cy="66" rx="5" ry="4" fill="#3d2a20" />
      <Blush />
    </>
  );
}

function Herisson({ joy }: { joy: boolean }) {
  return (
    <>
      <g fill="#7a5c3e">
        <path d="M50 8 L58 26 L42 26 Z" />
        <path d="M30 14 L40 30 L24 32 Z" />
        <path d="M70 14 L76 32 L60 30 Z" />
        <path d="M14 28 L28 40 L12 46 Z" />
        <path d="M86 28 L88 46 L72 40 Z" />
      </g>
      <ellipse cx="50" cy="58" rx="33" ry="30" fill="#e9d3b5" />
      <Eyes joy={joy} y={54} />
      <ellipse cx="50" cy="67" rx="5.4" ry="4.4" fill="#4a352a" />
      <Blush />
    </>
  );
}

function Lapin({ joy }: { joy: boolean }) {
  return (
    <>
      <ellipse cx="34" cy="18" rx="9" ry="17" fill="#7fa8c9" />
      <ellipse cx="66" cy="18" rx="9" ry="17" fill="#7fa8c9" />
      <ellipse cx="34" cy="19" rx="4.5" ry="11" fill="#f0e4ef" />
      <ellipse cx="66" cy="19" rx="4.5" ry="11" fill="#f0e4ef" />
      <ellipse cx="50" cy="58" rx="33" ry="30" fill="#8fb4d2" />
      <path d="M50 88 Q32 88 25 72 Q36 79 50 79 Q64 79 75 72 Q68 88 50 88Z" fill="#eef4f8" />
      <Eyes joy={joy} />
      <path d="M50 63 L46 68 Q50 71 54 68 Z" fill="#d97b93" />
      <g stroke="#5a7d99" strokeWidth="1.6" strokeLinecap="round">
        <path d="M20 64 L32 66" />
        <path d="M80 64 L68 66" />
      </g>
      <Blush />
    </>
  );
}

function Ours({ joy }: { joy: boolean }) {
  return (
    <>
      <circle cx="24" cy="28" r="11" fill="#6b4f3a" />
      <circle cx="76" cy="28" r="11" fill="#6b4f3a" />
      <circle cx="24" cy="28" r="5.5" fill="#c9a687" />
      <circle cx="76" cy="28" r="5.5" fill="#c9a687" />
      <ellipse cx="50" cy="56" rx="35" ry="32" fill="#7d5c44" />
      <ellipse cx="50" cy="70" rx="16" ry="12" fill="#c9a687" />
      <Eyes joy={joy} />
      <ellipse cx="50" cy="66" rx="6" ry="4.6" fill="#3d2a20" />
      <path d="M50 70 L50 75 M50 75 Q45 78 42 75 M50 75 Q55 78 58 75" stroke="#3d2a20" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Blush />
    </>
  );
}

export const SPECIES = ['renard', 'chouette', 'panda roux', 'hérisson', 'lapin', 'ours'] as const;

export function Creature({ species, size = 64, mood = 'normal', className }: Props) {
  const joy = mood === 'joy';
  const body = {
    renard: <Renard joy={joy} />,
    chouette: <Chouette joy={joy} />,
    'panda roux': <PandaRoux joy={joy} />,
    hérisson: <Herisson joy={joy} />,
    lapin: <Lapin joy={joy} />,
    ours: <Ours joy={joy} />,
  }[species] ?? <Renard joy={joy} />;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={species}
    >
      {body}
    </svg>
  );
}
