// The Tapp'd lockup: the real mark (frontend/public/favicon.svg, ink switched to white) beside the wordmark.
import { Img, staticFile } from 'remotion'

const SANS = 'Helvetica Neue, Helvetica, Arial, sans-serif'

/** `size` is the mark's height in px; the wordmark scales with it. */
export const LogoLockup = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.19, ...style }}>
    <Img src={staticFile('tappd-logo.svg')} style={{ width: size, height: size }} />
    <span style={{ fontFamily: SANS, fontSize: size * 0.78, fontWeight: 800, fontStyle: 'italic', color: '#fff', letterSpacing: size * 0.01 }}>
      TAPP'D
    </span>
  </div>
)
