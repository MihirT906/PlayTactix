import React, { type Ref } from 'react'
import './Controls.css'
import AnnotationStore from '../services/AnnotationStore-optimized'
import { FaPlay, FaPause } from 'react-icons/fa'
import { RiSlowDownLine, RiSpeedUpLine } from "react-icons/ri";
import { formatClipTime, formatMatchTime } from '../services/matchClock'
import { SLIDER_COLORS } from '../constants/sliderColors'
import type { MatchData } from '../types/MatchDataInterfaces'

interface ControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  playbackSpeed: number
  onDoubleSpeed: () => void
  onHalveSpeed: () => void
  currentMatchFrame: number
  clipFrame: number
  clipRange: { start: number; end: number }
  onClipFrameChange: (clipFrame: number) => void
  loadedFrameRanges: { start: number; end: number }[] // Match frames in memory
  segmentStart: number
  missingRanges: { start: number; end: number }[]
  annotationStore: AnnotationStore
  // The match's periods, to show the match clock; null until match meta loads.
  matchPeriods: MatchData['match_periods'] | null
  // The controls' outer element, for the match island to tell when they scroll out of view.
  containerRef?: Ref<HTMLDivElement>
}

const formatSpeed = (speed: number) => {
  const formatted = Number.isInteger(speed) ? speed.toString() : speed.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  return `${formatted}x`
}

// Builds the slider track background as hard-edged color bands: played progress,
// cached-but-unplayed, not-yet-loaded, and (overriding all of those) confirmed-missing
// frame ranges, so gaps in the data are visible on the scrubber regardless of playhead position.
const buildTrackGradient = (
  clipRange: { start: number; end: number },
  clipFrame: number,
  cachedRanges: { start: number; end: number }[],
  missingRanges: { start: number; end: number }[]
): string => {
  const totalLength = clipRange.end - clipRange.start || 1
  const toPercent = (frame: number) => Math.min(100, Math.max(0, ((frame - clipRange.start) / totalLength) * 100))

  const breakpoints = new Set<number>([0, 100, toPercent(clipFrame)])
  ;[...cachedRanges, ...missingRanges].forEach(({ start, end }) => {
    breakpoints.add(toPercent(start))
    breakpoints.add(toPercent(end + 1))
  })

  const sortedBreakpoints = Array.from(breakpoints).sort((a, b) => a - b)

  const colorAt = (percent: number): string => {
    const frame = clipRange.start + (percent / 100) * totalLength
    const isMissing = missingRanges.some(({ start, end }) => frame >= start && frame < end + 1)
    if (isMissing) return `var(--controls-slider-missing, ${SLIDER_COLORS.missing})`
    if (frame < clipFrame) return `var(--controls-slider-progress, ${SLIDER_COLORS.played})`
    const isCached = cachedRanges.some(({ start, end }) => frame >= start && frame < end + 1)
    if (isCached) return `var(--controls-slider-cached, ${SLIDER_COLORS.loaded})`
    return `var(--controls-slider-track, ${SLIDER_COLORS.loading})`
  }

  const stops: string[] = []
  for (let i = 0; i < sortedBreakpoints.length - 1; i++) {
    const start = sortedBreakpoints[i]
    const end = sortedBreakpoints[i + 1]
    if (end <= start) continue
    const color = colorAt((start + end) / 2)
    stops.push(`${color} ${start}%`, `${color} ${end}%`)
  }

  return `linear-gradient(to right, ${stops.join(', ')})`
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, playbackSpeed, onDoubleSpeed, onHalveSpeed, currentMatchFrame, clipFrame, clipRange, onClipFrameChange, loadedFrameRanges, segmentStart, missingRanges, annotationStore, matchPeriods, containerRef }) => {
  const matchTime = formatMatchTime(currentMatchFrame, matchPeriods)
  const clipTime = formatClipTime(clipFrame, clipRange.end)

  // The frames in memory on the clip's timeline, drawn as cached bands ahead of the playhead.
  const cachedClipRanges = loadedFrameRanges.map(({ start, end }) => ({ start: start - segmentStart, end: end - segmentStart }))

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value, 10)
    onClipFrameChange(frame)
  }

  const handleSliderDragEnd = (event: React.MouseEvent<HTMLInputElement>) => {
    const clipFrame = parseInt(event.currentTarget.value, 10)
    console.log('Slider changed, new clip frame:', clipFrame)
    annotationStore.reconstruct_active_annotations(clipFrame)
  }

  return (
    <div className="controls-container" ref={containerRef}>
      <div className="controls-toolbar">
        <div className="playback-speed-group">
          <button className="app-header-action speed-button" onClick={onHalveSpeed} title="Halve speed">
            <RiSlowDownLine />
            <span className="speed-button-label">0.5x</span>
          </button>
          <div className="play-pause-wrapper">
            <span className="speed-label">{formatSpeed(playbackSpeed)}</span>
            <button className="app-header-action play-pause-button" onClick={onPlayPause}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
          </div>
          <button className="app-header-action speed-button" onClick={onDoubleSpeed} title="Double speed">
            <RiSpeedUpLine />
            <span className="speed-button-label">2x</span>
          </button>
        </div>
        {/* Frame numbers stay on hover, for matching a moment against the data. */}
        <span className="frame-label" title={`Match frame ${currentMatchFrame} · Clip frame ${clipFrame}`}>
          Match Time: {matchTime} | Clip Time: {clipTime}
        </span>
      </div>
      <input
        className="frame-slider"
        type="range"
        min={clipRange.start}
        max={clipRange.end}
        value={clipFrame}
        onChange={handleSliderChange}
        onMouseUp={handleSliderDragEnd}
        style={{
          background: buildTrackGradient(clipRange, clipFrame, cachedClipRanges, missingRanges),
        }}
      />
    </div>
  )
}

export default Controls