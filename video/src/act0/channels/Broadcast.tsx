// Broadcast graphics shared by the Act 0 channels, in TV space (1600x900). All names are made up.
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'

/** The channel's logo and the show's name, top left. */
export const Bug = ({ channel, show }: { channel: string; show: string }) => (
  <g fontFamily={FONT} fill="#f4f1ea">
    <circle cx={78} cy={66} r={20} fill="none" stroke="#f4f1ea" strokeWidth={6} />
    <circle cx={78} cy={66} r={7} fill="#f4f1ea" />
    <text x={116} y={84} fontSize={50} fontWeight={800}>
      {channel}
    </text>
    <rect x={58} y={104} width={360} height={3} />
    <text x={60} y={140} fontSize={28} fontWeight={500} letterSpacing={3}>
      {show}
    </text>
  </g>
)

/** The score bar along the bottom. */
export const ScoreBar = ({
  left,
  right,
  clock,
  extra,
}: {
  left: [string, string]
  right: [string, string]
  clock: string
  extra: string
}) => (
  <g fontFamily={FONT} fontWeight={700} fontSize={34} fill="#f4f1ea">
    <rect y={842} width={1600} height={58} fill="#14171c" opacity={0.92} />
    <rect x={0} y={842} width={150} height={58} fill="#2a2f3a" />
    <text x={75} y={883} textAnchor="middle" fontSize={30}>
      LIVE
    </text>
    <rect x={170} y={854} width={26} height={34} rx={4} fill="#3e7c80" />
    <text x={210} y={883}>{left[0]}</text>
    <text x={420} y={883} textAnchor="end">
      {left[1]}
    </text>
    <rect x={470} y={854} width={26} height={34} rx={4} fill="#b5603c" />
    <text x={510} y={883}>{right[0]}</text>
    <text x={730} y={883} textAnchor="end">
      {right[1]}
    </text>
    <text x={800} y={883}>{clock}</text>
    <text x={1060} y={883}>{extra}</text>
  </g>
)
