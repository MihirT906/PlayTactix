// Act 3's screen layout, shared by the app and its interface pieces.
import { APP_ON_SCREEN } from '../act2/Act2'
import { APP_BAR_H } from '../match/Broadcast'

/** The app bar, scaled the way it filled the laptop's screen at the end of Act 2. */
export const A = APP_ON_SCREEN
export const BAR_BOTTOM = A.y + APP_BAR_H * A.s
export const SAVE_BUTTON = { x: A.x + 533 * A.s, y: A.y + 15 * A.s }

/** The left column: the tool rail, or a panel (Moments, Overlays) in its place. */
export const RAIL_W = 190
export const PANEL_W = 440
