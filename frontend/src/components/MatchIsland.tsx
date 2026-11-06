import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { FaPause, FaPlay } from 'react-icons/fa'
import './MatchIsland.css'
import TeamShirt from './TeamShirt'
import { useMatchSession } from '../context/MatchSessionContext'
import { useStyleConfig } from '../context/StyleConfigContext'
import { useScrolledPast } from '../hooks/useScrolledPast'
import { formatClipTime, formatMatchTime } from '../services/matchClock'
import type { MatchData } from '../types/MatchDataInterfaces'

type MatchIslandProps = {
  matchData: MatchData | null
  // The match card: the island shows once it has scrolled out of view.
  cardElement: HTMLElement | null
  // The playback controls: the island takes them on once they have scrolled out of view too.
  controlsElement: HTMLElement | null
}

// Grows `element` out of `from` (where the island stood in for it) back into its own place.
function growFrom(element: HTMLElement, from: DOMRect) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const to = element.getBoundingClientRect()
  if (to.width === 0) return
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  element.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0 },
      { opacity: 1, offset: 0.4 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 420, easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)' },
  )
}

// A one-line score bar that floats at the top of the workspace while the match card is
// out of view, and grows playback controls while the real ones are out of view too.
function MatchIsland({ matchData, cardElement, controlsElement }: MatchIslandProps) {
  const { session, togglePlayback } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const isVisible = useScrolledPast(cardElement)
  const showPlayback = useScrolledPast(controlsElement) && isVisible
  const [islandElement, setIslandElement] = useState<HTMLDivElement | null>(null)
  const playbackRef = useRef<HTMLDivElement>(null)
  const wasVisibleRef = useRef(isVisible)
  const wasShowingPlaybackRef = useRef(showPlayback)

  // When the card or the controls come back into view, they grow out of the part of the
  // island that stood in for them. The island's own exit transition has only just started
  // here, so it still measures where it was on screen.
  useLayoutEffect(() => {
    if (wasShowingPlaybackRef.current && !showPlayback && controlsElement && playbackRef.current) {
      growFrom(controlsElement, playbackRef.current.getBoundingClientRect())
    }
    if (wasVisibleRef.current && !isVisible && cardElement && islandElement) {
      growFrom(cardElement, islandElement.getBoundingClientRect())
    }
    wasVisibleRef.current = isVisible
    wasShowingPlaybackRef.current = showPlayback
  }, [isVisible, showPlayback, cardElement, controlsElement, islandElement])

  // The docked pitch sits just right of the island, so it needs the island's width as it grows.
  useEffect(() => {
    if (!islandElement) {
      return
    }
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--match-island-width', `${islandElement.offsetWidth}px`)
    })
    observer.observe(islandElement)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--match-island-width')
    }
  }, [islandElement])

  if (!matchData) {
    return null
  }

  const { isPlaying, currentMatchFrame, currentClipFrame, clip } = session.playback

  return (
    <div
      ref={setIslandElement}
      className={`match-island ${isVisible ? 'is-visible' : ''} ${showPlayback ? 'has-playback' : ''}`}
      style={{ '--home-color': homeTeamColor, '--away-color': awayTeamColor } as CSSProperties}
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      <button
        type="button"
        className="match-island-score-button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll back to match details"
      >
        <TeamShirt side="left" className="match-island-shirt" />
        <span className="match-island-team">{matchData.home_team.short_name}</span>
        <span className="match-island-score">{matchData.home_team_score} - {matchData.away_team_score}</span>
        <span className="match-island-team">{matchData.away_team.short_name}</span>
        <TeamShirt side="right" className="match-island-shirt" />
      </button>

      <div className="match-island-playback" ref={playbackRef} inert={!showPlayback}>
        <div className="match-island-playback-inner">
          <span className="match-island-divider" aria-hidden="true" />
          <button
            type="button"
            className="match-island-play"
            onClick={togglePlayback}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <span className="match-island-clock">
            <span className="match-island-clock-label">Match</span>
            {formatMatchTime(currentMatchFrame, matchData.match_periods)}
          </span>
          <span className="match-island-clock">
            <span className="match-island-clock-label">Clip</span>
            {formatClipTime(currentClipFrame, clip.length)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MatchIsland
