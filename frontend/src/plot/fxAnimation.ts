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
