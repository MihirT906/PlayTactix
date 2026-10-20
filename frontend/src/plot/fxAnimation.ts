// Timing for the animated annotation layers (see components/pitchFx.tsx).

// Start times are stamped by the next animation frame (null until then), so rendering never reads the clock.
export type StartedAt = number | null

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// The animations still running at `time`, with any not yet started stamped as starting then.
export function advanceAnimations<T extends { startedAt: StartedAt }>(animations: Map<string, T>, time: number, duration: number) {
  const next = new Map<string, T>()
  for (const [key, animation] of animations) {
    if (animation.startedAt === null) next.set(key, { ...animation, startedAt: time })
    else if (time - animation.startedAt < duration) next.set(key, animation)
  }
  return next
}

// How far through an animation started at `startedAt` the frame at `now` is, from 0 to 1.
export const animationProgress = (startedAt: StartedAt, now: number, duration: number) =>
  startedAt === null ? 0 : Math.min(1, (now - startedAt) / duration)

// The spring a new team shape or player line enters with: it grows from its centre, overshoots its
// full size and settles back to it. Its scale `age` ms after appearing, from 0 to 1 at rest.
export const ENTRANCE_DURATION = 550 // ms
const ENTRANCE_DECAY = 80 // ms
const ENTRANCE_PERIOD = 360 // ms
export const entranceScale = (age: number) =>
  age < ENTRANCE_DURATION ? 1 - Math.exp(-age / ENTRANCE_DECAY) * Math.cos((2 * Math.PI * age) / ENTRANCE_PERIOD) : 1
