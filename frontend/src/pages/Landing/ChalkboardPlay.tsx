// Decorative chalkboard sketch of an attacking move for the landing page. The arrows draw in one after
// another, the way a telestrator line goes down; prefers-reduced-motion shows the finished sketch.

// A 105 x 68 m pitch, attacking upwards, at 4.706 units per metre: touchlines at x 20 and 340,
// goal lines at y 23 and 517, halfway at y 270.
const PITCH_LINES = [
  'M20 23 H340 V517 H20 Z', // touchlines and goal lines
  'M20 270 H340', // halfway line
  // Top end: penalty area (40.32 x 16.5 m), goal area (18.32 x 5.5 m), goal (7.32 m), penalty arc (9.15 m from the spot)
  'M85.1 23 V100.6 H274.9 V23',
  'M136.9 23 V48.9 H223.1 V23',
  'M162.8 23 V13.6 H197.2 V23',
  'M145.6 100.6 A43.1 43.1 0 0 0 214.4 100.6',
  // Bottom end, mirrored
  'M85.1 517 V439.4 H274.9 V517',
  'M136.9 517 V491.1 H223.1 V517',
  'M162.8 517 V526.4 H197.2 V517',
  'M145.6 439.4 A43.1 43.1 0 0 1 214.4 439.4',
  // Corner arcs (1 m)
  'M24.7 23 A4.7 4.7 0 0 1 20 27.7',
  'M335.3 23 A4.7 4.7 0 0 0 340 27.7',
  'M20 512.3 A4.7 4.7 0 0 1 24.7 517',
  'M340 512.3 A4.7 4.7 0 0 0 335.3 517',
]

const PITCH_SPOTS: [number, number][] = [
  [180, 74.8], // penalty spots, 11 m out
  [180, 465.2],
  [180, 270], // centre spot
]

const ATTACKERS: [number, number][] = [
  [182, 205], // central midfielder, plays the pass
  [273, 142], // right winger, receives it
  [177, 138], // striker
  [102, 191], // left forward
  [241, 255], // right back, overlaps
  [140, 372], // centre backs
  [224, 366],
  [180, 504], // goalkeeper
]

const DEFENDERS: [number, number][] = [
  [76, 118],
  [208, 126],
  [252, 118],
  [185, 162],
  [180, 36], // goalkeeper
  [146, 336], // their forward, left upfield
]

// Each arrow's head sits at its end point, rotated to the path's final direction (end minus last control point)
const ARROWS = [
  { d: 'M194 197 L248 151', head: [248, 151], angle: -40.8 },
  { d: 'M173 129 C154 96 176 69 213 60', head: [213, 60], angle: -13.9 },
  { d: 'M100 180 C85 148 100 122 132 113', head: [132, 113], angle: -15.7 },
  { d: 'M251 250 C299 229 303 176 296 137', head: [296, 137], angle: -99.9 },
]

const CROSS = 8

export default function ChalkboardPlay({ className }: { className?: string }) {
  return (
    <svg className={`chalkboard ${className ?? ''}`} viewBox="-8 -4 376 548" aria-hidden="true">
      <defs>
        <filter id="landing-chalk" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="4" xChannelSelector="R" yChannelSelector="G" result="wobbly" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="7" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.55" result="grainAlpha" />
          <feComposite in="wobbly" in2="grainAlpha" operator="in" />
        </filter>
        <radialGradient id="landing-chalk-dust">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="270" rx="200" ry="280" fill="url(#landing-chalk-dust)" />

      <g filter="url(#landing-chalk)" transform="rotate(-3 180 270)">
        <g className="chalkboard-lines">
          {PITCH_LINES.map((d) => (
            <path key={d} d={d} />
          ))}
          <circle cx="180" cy="270" r="43.1" />
          {PITCH_SPOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} className="chalkboard-spot" cx={x} cy={y} r="1.8" />
          ))}
        </g>

        <g className="chalkboard-defenders">
          {DEFENDERS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="6.5" />
          ))}
        </g>

        <g className="chalkboard-attackers">
          {ATTACKERS.map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              d={`M${x - CROSS} ${y - CROSS} L${x + CROSS} ${y + CROSS} M${x + CROSS} ${y - CROSS} L${x - CROSS} ${y + CROSS}`}
            />
          ))}
        </g>

        <g className="chalkboard-arrows">
          {ARROWS.map((a, i) => (
            <g key={a.d} style={{ '--chalk-delay': `${0.4 + i * 0.7}s` } as React.CSSProperties}>
              <path className="chalkboard-arrow-line" d={a.d} pathLength={1} />
              <path
                className="chalkboard-arrow-head"
                d="M-11 -7 L0 0 L-11 7"
                transform={`translate(${a.head[0]} ${a.head[1]}) rotate(${a.angle})`}
              />
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}
