import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { FaPlus, FaSlidersH, FaTimes } from 'react-icons/fa'
import type TimelineStore from '../../services/TimelineStore'
import { useMatchSession } from '../../context/MatchSessionContext'
import { useStyleConfig } from '../../context/StyleConfigContext'
import { APP_CONFIG } from '../../config'
import { EVENT_TYPES, formatEventValue } from '../../constants/eventData'
import {
  METRICS,
  getClipEvents,
  getMetricDescription,
  getClipPhases,
  matchesFilterTimeline,
  matchesInsightFilter,
  type ClipPhase,
} from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import type { PhasesOfPlay } from '../../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'
import type { InsightFilter, TimelineOption } from '../../types/TimelineOption'
import { ContextMenu, type ContextMenuItem } from '../context-menu/ContextMenu'
import { buildTimelineRows, getRowHeight } from '../event-timeline/rows'
import LaneTrack from '../event-timeline/LaneTrack'
import ValueTrack from '../event-timeline/ValueTrack'
import MetricTrack from '../event-timeline/MetricTrack'
import PossessionBandTrack from '../event-timeline/PossessionBandTrack'
import PhaseTrack from '../event-timeline/PhaseTrack'
import { InsightFilterControls } from './InsightFilterControls'
import { TimelineGroup } from './TimelineGroup'
import { TimelineRow } from './TimelineRow'
import '../event-timeline/tracks.css'

type MenuState = { x: number; y: number; items: ContextMenuItem[]; anchor?: HTMLElement } | null

type InsightGroupProps = {
  timelineStore: TimelineStore
  /** Every event of the match; the ones in the clip are found through its match segments. */
  matchEvents: Event[] | null
  /** Every phase of play of the match. */
  phases: PhasesOfPlay[] | null
  matchData: MatchData | null
  clipFrame: number
  clipRange: { start: number; end: number }
  scaleStart: number
  scaleEnd: number
  labelWidth: number
  trackWidth: number
  currentFrameOffsetPercent: number
  /** The event under the pointer, so the pitch can pick out its players; null when there is none. */
  onEventHover: (event: Event | null) => void
}

/**
 * The Insights tracks: the phases of play, what happened across the clip (event tracks) and how
 * metrics moved (metric tracks), on the same scale as the rest of the timeline. Pressing an event or
 * phase jumps to its start, and hovering an event picks out its players on the pitch. The event
 * tracks can be filtered to a team and players. Tracks are added and removed here; their finer
 * settings (subtypes, bar height, aggregation) live in the sidebar's Insights panel.
 */
export function InsightGroup({
  timelineStore,
  matchEvents,
  phases,
  matchData,
  clipFrame,
  clipRange,
  scaleStart,
  scaleEnd,
  labelWidth,
  trackWidth,
  currentFrameOffsetPercent,
  onEventHover,
}: InsightGroupProps) {
  const { session, setCurrentClipFrame, stopPlayback, setSidebarPanel } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())
  const [filter, setFilter] = useState<InsightFilter>(timelineStore.getFilter())
  const [collapsed, setCollapsed] = useState(false)
  const [menu, setMenu] = useState<MenuState>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const matchSegments = session.playback.clip.matchSegments

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])
  useEffect(() => timelineStore.subscribeFilter(setFilter), [timelineStore])

  // A hovered event can vanish without a mouseleave (collapsed, removed, unmounted), so let it go then.
  useEffect(() => () => onEventHover(null), [onEventHover])

  const { start: clipStart, end: clipEnd } = clipRange

  const clipEvents = useMemo(() => getClipEvents(matchEvents, matchSegments), [matchEvents, matchSegments])
  const clipPhases = useMemo(() => getClipPhases(phases, matchSegments), [phases, matchSegments])
  const filteredEvents = useMemo(
    () => clipEvents.filter((event) => matchesInsightFilter(filter, event)),
    [clipEvents, filter],
  )

  const rows = useMemo(
    () =>
      buildTimelineRows(
        timelines,
        { events: clipEvents, phases: clipPhases, filter },
        { start: clipStart, end: clipEnd },
        { start: scaleStart, end: scaleEnd },
      ),
    [timelines, clipEvents, clipPhases, filter, clipStart, clipEnd, scaleStart, scaleEnd],
  )

  const visibleFrameSpan = Math.max(scaleEnd - scaleStart, 1)

  const getEventColor = (teamId: number) => {
    if (teamId === matchData?.home_team.id) return homeTeamColor
    if (teamId === matchData?.away_team.id) return awayTeamColor
    return getComputedStyle(document.documentElement).getPropertyValue('--app-bg-accent').trim() || APP_CONFIG.theme.colors.accent
  }

  const getTeamName = (teamId: number) => {
    if (teamId === matchData?.home_team.id) return matchData.home_team.short_name
    if (teamId === matchData?.away_team.id) return matchData.away_team.short_name
    return 'Unknown team'
  }

  const seekTo = (frame: number) => {
    stopPlayback()
    setCurrentClipFrame(Math.min(Math.max(frame, clipStart), clipEnd))
  }
  const seekToEvent = (event: Event) => seekTo(event.frame_start)
  const seekToPhase = (phase: ClipPhase) => seekTo(phase.frameStart)

  const openAdvanced = () => setSidebarPanel('timeline')

  const openMenuBelow = (target: HTMLElement, items: ContextMenuItem[]) => {
    const rect = target.getBoundingClientRect()
    setMenu({ x: rect.left, y: rect.bottom + 4, items, anchor: target })
  }

  const hasPhases = timelines.some((timeline) => timeline.kind === 'phases')

  const addTrackItems = (): ContextMenuItem[] => [
    {
      section: 'Context',
      label: (
        <span className="insight-menu-item">
          Phases of play
          {hasPhases ? <span className="insight-menu-item__meta">On</span> : null}
        </span>
      ),
      onSelect: () => {
        setCollapsed(false)
        timelineStore.togglePhases()
      },
    },
    ...EVENT_TYPES.map((eventType) => ({
      section: 'Events',
      label: (
        <span className="insight-menu-item">
          {formatEventValue(eventType)}
          <span className="insight-menu-item__meta">
            {filteredEvents.filter((event) => matchesFilterTimeline({ eventType, subtypes: [] }, event)).length}
          </span>
        </span>
      ),
      onSelect: () => {
        setCollapsed(false)
        timelineStore.add({ kind: 'filter', eventType })
      },
    })),
    ...METRICS.map((metric) => {
      const isOn = timelines.some((timeline) => timeline.kind === 'metric' && timeline.column === metric.column)
      return {
        section: 'Metrics',
        label: (
          <span className="insight-menu-item" title={getMetricDescription(metric.column)}>
            {metric.label}
            {isOn ? <span className="insight-menu-item__meta">On</span> : null}
          </span>
        ),
        onSelect: () => {
          setCollapsed(false)
          timelineStore.toggleMetric(metric)
        },
      }
    }),
    { section: 'More', label: 'Track settings…', onSelect: openAdvanced },
  ]

  const trackItems = (timelineId: string): ContextMenuItem[] => [
    { label: 'Track settings…', onSelect: openAdvanced },
    { label: 'Remove track', danger: true, onSelect: () => timelineStore.remove(timelineId) },
  ]

  const openTrackMenu = (event: MouseEvent, timelineId: string) => {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY, items: trackItems(timelineId) })
  }

  const actions = (
    <div className="annotation-timeline__group-actions">
      <button
        type="button"
        className="annotation-timeline__group-action"
        onClick={(event) => {
          if (menu?.anchor === event.currentTarget) setMenu(null)
          else openMenuBelow(event.currentTarget, addTrackItems())
        }}
        aria-haspopup="menu"
      >
        <FaPlus aria-hidden="true" />
        Add track
      </button>
      <button
        type="button"
        className="annotation-timeline__group-action"
        onClick={openAdvanced}
        aria-label="Open track settings"
        title="Track settings"
      >
        <FaSlidersH aria-hidden="true" />
      </button>
      <InsightFilterControls timelineStore={timelineStore} matchData={matchData} clipEvents={clipEvents} />
      {/* Portalled, so it shows wherever it is opened from, even with the rows collapsed. */}
      {menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} anchor={menu.anchor} onClose={closeMenu} />
      ) : null}
    </div>
  )

  const hiddenCount = timelines.filter((timeline) => timeline.hidden).length

  return (
    <TimelineGroup
      title="Insights"
      actions={actions}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((current) => !current)}
    >
      {timelines.length === 0 ? (
        <div className="annotation-timeline__empty">
          No tracks yet. Use <strong>Add track</strong> to see when events happened and how metrics moved.
        </div>
      ) : rows.length === 0 ? (
        <div className="annotation-timeline__empty">All tracks are hidden. Show them from track settings.</div>
      ) : (
        rows.map((row) => (
          <TimelineRow
            key={row.key}
            label={row.label}
            description={row.description}
            labelWidth={labelWidth}
            trackWidth={trackWidth}
            trackHeight={getRowHeight(row)}
            currentFrameOffsetPercent={currentFrameOffsetPercent}
            onLabelContextMenu={(event) => openTrackMenu(event, row.timelineId)}
            labelActions={
              <button
                type="button"
                className="annotation-timeline__label-action"
                onClick={() => timelineStore.remove(row.timelineId)}
                aria-label={`Remove ${row.label}`}
                title="Remove track"
              >
                <FaTimes aria-hidden="true" />
              </button>
            }
          >
            {row.kind === 'phases' ? (
              <PhaseTrack
                row={row}
                clipFrame={clipFrame}
                getTeamColor={getEventColor}
                getTeamName={getTeamName}
                onPhaseSeek={seekToPhase}
              />
            ) : row.kind === 'lanes' ? (
              <LaneTrack
                row={row}
                clipFrame={clipFrame}
                getEventColor={getEventColor}
                onEventSeek={seekToEvent}
                onEventHover={onEventHover}
              />
            ) : row.kind === 'value' ? (
              <ValueTrack
                row={row}
                clipFrame={clipFrame}
                timelineTrackWidth={trackWidth}
                getEventColor={getEventColor}
                onEventSeek={seekToEvent}
                onEventHover={onEventHover}
              />
            ) : row.kind === 'possessionBand' ? (
              <PossessionBandTrack
                row={row}
                scaleStart={scaleStart}
                visibleFrameSpan={visibleFrameSpan}
                timelineTrackWidth={trackWidth}
              />
            ) : (
              <MetricTrack
                row={row}
                scaleStart={scaleStart}
                visibleFrameSpan={visibleFrameSpan}
                timelineTrackWidth={trackWidth}
              />
            )}
          </TimelineRow>
        ))
      )}
      {hiddenCount > 0 && rows.length > 0 ? (
        <div className="annotation-timeline__empty">
          {hiddenCount} hidden {hiddenCount === 1 ? 'track' : 'tracks'}
        </div>
      ) : null}
    </TimelineGroup>
  )
}
