import { useEffect, useRef, useState } from 'react'

type Feature = {
  title: string
  body: string
  // A recording in frontend/public/docs-media, and the stretch of it to show, in seconds.
  media: string
  start?: number
  end?: number
}

const FEATURES: Feature[] = [
  {
    title: 'Find moments in soccer terms',
    body: "Filter a match down to what you're after: the moves that ended in a shot, one area of the pitch, what the full-backs were doing. No hunting through 90 minutes.",
    media: 'workspace-moment.mp4',
  },
  {
    title: "See what video can't show",
    body: 'Was the pass really on? Was there space to run into? Overlays like pitch control and pass probability put the answer on the pitch, where everyone can see it.',
    media: 'workspace-overlay.mp4',
  },
  {
    title: 'Draw on the play as it moves',
    body: "What you draw appears in time with the action, so it feels like you're talking someone through the move as it happens.",
    media: 'workspace-draw.mp4',
  },
  {
    title: 'Tell the story in one clip',
    body: 'Pull the moments that make your case into one clip. Save it, send it, and get a proper debate going.',
    media: 'workspace-story.mp4',
  },
]

// How long a feature stays up when its stretch has no end given, or its recording is missing.
const DEFAULT_SHOW_SECONDS = 15

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The features as a list beside a video of the selected one. Until someone picks one, it moves on to the next
// when each video's stretch ends; once they do, it stays there and loops. Nothing plays while the section is
// off screen.
export default function FeatureShowcase() {
  const [active, setActive] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(() => !prefersReducedMotion())
  const [inView, setInView] = useState(false)
  const [missing, setMissing] = useState<Record<string, boolean>>({})

  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)

  const feature = FEATURES[active]
  const start = feature.start ?? 0
  const end = feature.end ?? start + DEFAULT_SHOW_SECONDS
  const isMissing = missing[feature.media] ?? false

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Play only while on screen; a reduced-motion visitor starts it themselves with the controls.
  useEffect(() => {
    const video = videoRef.current
    if (!video || prefersReducedMotion()) return
    if (inView) void video.play().catch(() => {})
    else video.pause()
  }, [inView, active, isMissing])

  // Each frame: fill the active item's progress bar, and at the end of the stretch move on or loop back.
  // A missing recording counts down on the clock instead, so the list still moves past it.
  useEffect(() => {
    if (!inView) return
    let frame = 0
    let missingElapsed = 0
    let last = performance.now()
    const tick = (now: number) => {
      const video = videoRef.current
      let fraction: number
      if (isMissing || !video) {
        missingElapsed += (now - last) / 1000
        fraction = missingElapsed / DEFAULT_SHOW_SECONDS
      } else {
        const stop = Math.min(end, video.duration || end)
        fraction = (video.currentTime - start) / (stop - start)
      }
      last = now
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(Math.max(fraction, 0), 1)})`
      if (fraction >= 1) {
        if (autoAdvance) {
          setActive((index) => (index + 1) % FEATURES.length)
          return
        }
        missingElapsed = 0
        if (video && !isMissing) {
          video.currentTime = start
          if (!prefersReducedMotion()) void video.play().catch(() => {})
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, active, autoAdvance, isMissing, start, end])

  const choose = (index: number) => {
    setAutoAdvance(false)
    setActive(index)
  }

  return (
    <section className="landing-section feature-showcase" ref={sectionRef}>
      <h2 className="landing-heading">What you can do</h2>
      <div className="feature-showcase-body">
        <ol className="feature-list">
          {FEATURES.map((f, index) => {
            const selected = index === active
            return (
              <li key={f.title} className={`feature-item ${selected ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="feature-item-button"
                  aria-expanded={selected}
                  aria-controls="feature-showcase-media"
                  onClick={() => choose(index)}
                >
                  {f.title}
                </button>
                {selected ? (
                  <>
                    <p className="feature-item-body">{f.body}</p>
                    <span className="feature-item-progress" aria-hidden="true">
                      <span ref={progressRef} />
                    </span>
                  </>
                ) : null}
              </li>
            )
          })}
        </ol>
        <div className="feature-showcase-media" id="feature-showcase-media">
          {isMissing ? (
            <div className="feature-showcase-missing">
              To record: <code>{feature.media}</code>
            </div>
          ) : (
            <video
              key={feature.media}
              ref={videoRef}
              src={`/docs-media/${feature.media}`}
              aria-label={feature.title}
              muted
              playsInline
              preload="metadata"
              controls={prefersReducedMotion()}
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = start
              }}
              onError={() => setMissing((m) => ({ ...m, [feature.media]: true }))}
            />
          )}
        </div>
      </div>
    </section>
  )
}
