import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  BALL,
  LOGO_HEIGHT,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
  PLAYER_DARK_PATH,
  PLAYER_ORANGE_PATH,
} from './logoShapes'
import './BrandTitle.css'

// Intro timings in ms, counted from when the fonts have loaded.
const START_DELAY = 250
const BALL_DURATION = 1300
const RUN_DELAY = START_DELAY + 450
const RUN_DURATION = BALL_DURATION - 450 // the player arrives as the ball does
const POP_DELAY = RUN_DELAY + RUN_DURATION * 0.35 // once the player has run clear of the A's slot
const POP_DURATION = 420

// The player's size while standing in for the A, relative to its size as the logo.
const IN_WORD_SCALE = 0.8
// How much of the scaled player's width the gap in the word makes room for; letters' own spacing covers the rest.
const IN_WORD_GAP_FIT = 0.9

// The flick of the ball when the logo is hovered, in ms.
const KICK_DURATION = 650
const KICK_BALL_DELAY = 100 // the ball leaves as the foot comes up

const FALL = 'cubic-bezier(0.55, 0, 1, 0.45)'
const RISE = 'cubic-bezier(0, 0.55, 0.45, 1)'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type BrandTitleProps = {
  title: string
}

// The brand name with the logo to its left. On every load and page change the logo's player starts
// inside the word as its A, then runs left to meet a ball bouncing in from off-screen, and a plain A
// pops into the gap it leaves. Names without an A just show the logo. Hovering flicks the ball up off
// the player's foot.
export default function BrandTitle({ title }: BrandTitleProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const markRef = useRef<HTMLSpanElement>(null)
  const playerRef = useRef<SVGSVGElement>(null)
  const ballRollRef = useRef<HTMLSpanElement>(null)
  const ballBounceRef = useRef<SVGSVGElement>(null)
  const aRef = useRef<HTMLSpanElement>(null)
  const restRef = useRef<HTMLSpanElement>(null)
  // Whatever is playing now, so a hover doesn't start a kick over the intro or another kick.
  const animationsRef = useRef<Animation[]>([])

  const { pathname } = useLocation()
  const aIndex = title.search(/a/i)

  useLayoutEffect(() => {
    const root = rootRef.current
    const mark = markRef.current
    const player = playerRef.current
    const ballRoll = ballRollRef.current
    const ballBounce = ballBounceRef.current
    const a = aRef.current
    const rest = restRef.current
    if (!root || !mark || !player || !ballRoll || !ballBounce || !a || !rest) return
    if (prefersReducedMotion()) return

    // A page change can land mid-kick or mid-intro; start over from the beginning.
    animationsRef.current.forEach((animation) => animation.cancel())

    // Hidden until the fonts are in, since the letters' widths decide where the player starts.
    root.dataset.intro = 'pending'
    let cancelled = false
    const animations: Animation[] = []
    animationsRef.current = animations

    void document.fonts.ready.then(() => {
      if (cancelled) return

      const markWidth = mark.offsetWidth
      const markHeight = mark.offsetHeight
      const gap = Math.max(0, markWidth * IN_WORD_SCALE * IN_WORD_GAP_FIT - a.offsetWidth)
      const slotCenter = a.offsetLeft + (a.offsetWidth + gap) / 2
      const runFrom = slotCenter - (mark.offsetLeft + markWidth / 2)
      const ballFrom = -(mark.getBoundingClientRect().left + markWidth) // just past the window's left edge

      const midScale = (IN_WORD_SCALE + 1) / 2
      const pose = (x: number, y: number, scale: number, lean: number) =>
        `translate(${x}px, ${y}px) scale(${scale}) rotate(${lean}deg)`
      animations.push(
        player.animate(
          [
            { transform: pose(runFrom, 0, IN_WORD_SCALE, 0) },
            { offset: 0.5, transform: pose(runFrom * 0.45, -markHeight * 0.08, midScale, -8) },
            { offset: 0.88, transform: pose(-2, 0, 1, 2) }, // a small give as the ball arrives
            { transform: pose(0, 0, 1, 0) },
          ],
          { delay: RUN_DELAY, duration: RUN_DURATION, easing: 'cubic-bezier(0.55, 0, 0.3, 1)', fill: 'backwards' },
        ),
      )

      animations.push(
        ballRoll.animate([{ transform: `translateX(${ballFrom}px)` }, { transform: 'translateX(0)' }], {
          delay: START_DELAY,
          duration: BALL_DURATION,
          easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
          fill: 'backwards',
        }),
      )

      const lift = (height: number) => `translateY(${-height * markHeight}px)`
      animations.push(
        ballBounce.animate(
          [
            { transform: lift(0.9), easing: FALL },
            { offset: 0.38, transform: lift(0), easing: RISE },
            { offset: 0.6, transform: lift(0.35), easing: FALL },
            { offset: 0.78, transform: lift(0), easing: RISE },
            { offset: 0.88, transform: lift(0.1), easing: FALL },
            { transform: lift(0) },
          ],
          { delay: START_DELAY, duration: BALL_DURATION, fill: 'backwards' },
        ),
      )

      animations.push(
        a.animate(
          [
            { transform: 'scale(0)', opacity: 0 },
            { offset: 0.6, transform: 'scale(1.2)', opacity: 1 },
            { transform: 'scale(1)', opacity: 1 },
          ],
          { delay: POP_DELAY, duration: POP_DURATION, easing: 'ease-out', fill: 'backwards' },
        ),
        rest.animate([{ transform: `translateX(${gap}px)` }, { transform: 'translateX(0)' }], {
          delay: POP_DELAY,
          duration: POP_DURATION,
          easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
          fill: 'backwards',
        }),
      )

      delete root.dataset.intro
    })

    return () => {
      cancelled = true
      animations.forEach((animation) => animation.cancel())
      delete root.dataset.intro
    }
  }, [aIndex, pathname])

  const playKick = () => {
    const mark = markRef.current
    const player = playerRef.current
    const ballBounce = ballBounceRef.current
    if (!mark || !player || !ballBounce) return
    if (prefersReducedMotion() || animationsRef.current.some((animation) => animation.playState === 'running')) return

    const lift = (height: number) => `translateY(${-height * mark.offsetHeight}px)`
    animationsRef.current = [
      // Leaning back about the feet raises the kicking foot on the left.
      player.animate(
        [
          { transform: 'rotate(0deg)' },
          { offset: 0.2, transform: 'rotate(6deg)' },
          { offset: 0.45, transform: 'rotate(-2deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: KICK_DURATION, easing: 'ease-out' },
      ),
      ballBounce.animate(
        [
          { transform: lift(0), easing: RISE },
          { offset: 0.4, transform: lift(0.55), easing: FALL },
          { offset: 0.75, transform: lift(0), easing: RISE },
          { offset: 0.87, transform: lift(0.08), easing: FALL },
          { transform: lift(0) },
        ],
        { delay: KICK_BALL_DELAY, duration: KICK_DURATION },
      ),
    ]
  }

  return (
    <span className="brand-title" ref={rootRef} onMouseEnter={playKick}>
      <span className="brand-title-text">{title}</span>
      <span className="brand-title-visual" aria-hidden="true">
        <span
          className="brand-mark"
          ref={markRef}
          style={{ width: `calc(var(--brand-mark-height) * ${LOGO_WIDTH / LOGO_HEIGHT})` }}
        >
          <span className="brand-mark-ball" ref={ballRollRef}>
            <svg viewBox={LOGO_VIEWBOX} ref={ballBounceRef}>
              <circle cx={BALL.cx} cy={BALL.cy} r={BALL.r} fill="currentColor" />
            </svg>
          </span>
          <svg className="brand-mark-player" viewBox={LOGO_VIEWBOX} ref={playerRef}>
            <path className="brand-mark-accent" d={PLAYER_ORANGE_PATH} />
            <path d={PLAYER_DARK_PATH} fill="currentColor" />
          </svg>
        </span>
        {aIndex < 0 ? (
          title
        ) : (
          <>
            {title.slice(0, aIndex)}
            <span className="brand-title-a" ref={aRef}>
              {title[aIndex]}
            </span>
            <span className="brand-title-rest" ref={restRef}>
              {title.slice(aIndex + 1)}
            </span>
          </>
        )}
      </span>
    </span>
  )
}
