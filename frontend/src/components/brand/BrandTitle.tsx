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

// The goal kick on hover, in ms: wind-up and strike, the ball sailing off downfield, then a new one
// bouncing in to the player's foot.
const KICK_PLAYER_DURATION = 750
const KICK_STRIKE_AT = 280 // when the foot meets the ball
const KICK_FLIGHT_DURATION = 750
const KICK_RETURN_PAUSE = 300
const KICK_RETURN_DURATION = 900
// How far the struck ball travels, relative to the logo's height.
const KICK_FLIGHT_LEFT = 1.2
const KICK_FLIGHT_PEAK = 1.3

const FALL = 'cubic-bezier(0.55, 0, 1, 0.45)'
const RISE = 'cubic-bezier(0, 0.55, 0.45, 1)'

// Scaling the ball's layer about this point shrinks the ball in place as it flies away.
const BALL_ORIGIN = `${(BALL.cx / LOGO_WIDTH) * 100}% ${(BALL.cy / LOGO_HEIGHT) * 100}%`

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// The ball bouncing in from just past the window's left edge to rest at the player's foot. Held
// off-screen until its delay is up.
function animateBallEntry(
  mark: HTMLElement,
  ballRoll: Element,
  ballBounce: Element,
  delay: number,
  duration: number,
): Animation[] {
  const from = -(mark.getBoundingClientRect().left + mark.offsetWidth)
  const lift = (height: number) => `translateY(${-height * mark.offsetHeight}px)`
  return [
    ballRoll.animate([{ transform: `translateX(${from}px)` }, { transform: 'translateX(0)' }], {
      delay,
      duration,
      easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
      fill: 'backwards',
    }),
    ballBounce.animate(
      [
        { transform: lift(0.9), easing: FALL },
        { offset: 0.38, transform: lift(0), easing: RISE },
        { offset: 0.6, transform: lift(0.35), easing: FALL },
        { offset: 0.78, transform: lift(0), easing: RISE },
        { offset: 0.88, transform: lift(0.1), easing: FALL },
        { transform: lift(0) },
      ],
      { delay, duration, fill: 'backwards' },
    ),
  ]
}

type BrandTitleProps = {
  title: string
}

// The brand name with the logo to its left. On every load and page change the logo's player starts
// inside the word as its A, then runs left to meet a ball bouncing in from off-screen, and a plain A
// pops into the gap it leaves. Names without an A just show the logo. Hovering takes a goal kick: the
// ball sails off downfield and a new one bounces in.
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

      animations.push(...animateBallEntry(mark, ballRoll, ballBounce, START_DELAY, BALL_DURATION))

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
    const ballRoll = ballRollRef.current
    const ballBounce = ballBounceRef.current
    if (!mark || !player || !ballRoll || !ballBounce) return
    if (prefersReducedMotion() || animationsRef.current.some((animation) => animation.playState === 'running')) return

    const markHeight = mark.offsetHeight
    const strike = KICK_STRIKE_AT / KICK_PLAYER_DURATION
    // Created before the flight so the flight, made later, wins while it plays; once it ends the
    // replacement ball is held off-screen until it bounces in.
    const replacement = animateBallEntry(
      mark,
      ballRoll,
      ballBounce,
      KICK_STRIKE_AT + KICK_FLIGHT_DURATION + KICK_RETURN_PAUSE,
      KICK_RETURN_DURATION,
    )

    animationsRef.current = [
      ...replacement,
      // Rotating clockwise about the feet swings the kicking foot on the left up through the ball.
      player.animate(
        [
          { transform: 'rotate(0deg)', easing: 'ease-out' },
          { offset: strike * 0.8, transform: 'rotate(-5deg)', easing: 'ease-in' }, // wind-up
          { offset: strike, transform: 'rotate(6deg)', easing: 'ease-out' },
          { offset: strike + 0.15, transform: 'rotate(12deg)', easing: 'ease-in-out' }, // follow-through
          { offset: 0.85, transform: 'rotate(-1deg)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: KICK_PLAYER_DURATION },
      ),
      // Struck up and away downfield, shrinking into the distance.
      ballRoll.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-KICK_FLIGHT_LEFT * markHeight}px)` }], {
        delay: KICK_STRIKE_AT,
        duration: KICK_FLIGHT_DURATION,
        easing: 'cubic-bezier(0.15, 0.7, 0.4, 1)',
        fill: 'backwards',
      }),
      ballBounce.animate(
        [
          { transform: 'translateY(0) scale(1)', opacity: 1, easing: RISE },
          {
            offset: 0.55,
            transform: `translateY(${-KICK_FLIGHT_PEAK * markHeight}px) scale(0.55)`,
            opacity: 1,
            easing: FALL,
          },
          { transform: `translateY(${-KICK_FLIGHT_PEAK * 0.7 * markHeight}px) scale(0.2)`, opacity: 0 },
        ],
        { delay: KICK_STRIKE_AT, duration: KICK_FLIGHT_DURATION, fill: 'backwards' },
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
            <svg viewBox={LOGO_VIEWBOX} ref={ballBounceRef} style={{ transformOrigin: BALL_ORIGIN }}>
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
