import { useCallback, useEffect, useMemo, useState } from 'react'
import type TimelineStore from '../../services/TimelineStore'
import { useMatchSession } from '../../context/MatchSessionContext'
import { useStyleConfig } from '../../context/StyleConfigContext'
import { APP_CONFIG } from '../../config'
import { describeTrackFilter, getClipEvents } from '../../services/timelineEvents'
import type { Event } from '../../types/FrameDataInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'
import type { TimelineOption } from '../../types/TimelineOption'
import { buildTimelineRows, getRowHeight } from '../event-timeline/rows'
import LaneTrack from '../event-timeline/LaneTrack'
import ValueTrack from '../event-timeline/ValueTrack'
import MomentumTrack from '../event-timeline/MomentumTrack'
import { getMomentumScale } from '../event-timeline/momentum'
import { TimelineGroup } from './TimelineGroup'
import { TimelineRow } from './TimelineRow'
import '../event-timeline/tracks.css'

type InsightGroupProps = {
  timelineStore: TimelineStore
  /** Every event of the match; the ones in the clip are found through its match segments. */
  matchEvents: Event[] | null
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
 * The Insights tracks: what happened across the clip (event tracks) and how metrics moved (metric
 * tracks), on the same scale as the rest of the timeline. Pressing an event jumps to its start, and
 * hovering an event picks out its players on the pitch. The tracks, and the team and players each
 * event track is narrowed to, are all set in the sidebar's Insights panel; here they are only shown.
 */
export function InsightGroup({
  timelineStore,
  matchEvents,
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
  const { session, setCurrentClipFrame, stopPlayback } = useMatchSession()
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())
  const [collapsed, setCollapsed] = useState(false)
  const matchSegments = session.playback.clip.matchSegments

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])

  // A hovered event can vanish without a mouseleave (collapsed, removed, unmounted), so let it go then.
  useEffect(() => () => onEventHover(null), [onEventHover])

  const { start: clipStart, end: clipEnd } = clipRange

  const clipEvents = useMemo(() => getClipEvents(matchEvents, matchSegments), [matchEvents, matchSegments])

  const getTeamName = useCallback(
    (teamId: number) => {
      if (teamId === matchData?.home_team.id) return matchData.home_team.short_name
      if (teamId === matchData?.away_team.id) return matchData.away_team.short_name
      return 'Unknown team'
    },
    [matchData],
  )
  const getPlayerName = useCallback(
    (playerId: number) => matchData?.players.find((player) => player.id === playerId)?.short_name ?? `Player ${playerId}`,
    [matchData],
  )

  const momentumScale = useMemo(() => getMomentumScale(matchEvents ?? []), [matchEvents])
  const homeTeamId = matchData?.home_team.id
  const awayTeamId = matchData?.away_team.id
  const rows = useMemo(
    () =>
      buildTimelineRows(
        timelines,
        {
          events: clipEvents,
          describeFilter: (timeline) => describeTrackFilter(timeline, getTeamName, getPlayerName),
          teamIds: homeTeamId != null && awayTeamId != null ? [homeTeamId, awayTeamId] : [],
          momentumScale,
        },
        { start: clipStart, end: clipEnd },
        { start: scaleStart, end: scaleEnd },
      ),
    [timelines, clipEvents, getTeamName, getPlayerName, homeTeamId, awayTeamId, momentumScale, clipStart, clipEnd, scaleStart, scaleEnd],
  )

  const getEventColor = (teamId: number) => {
    if (teamId === matchData?.home_team.id) return homeTeamColor
    if (teamId === matchData?.away_team.id) return awayTeamColor
    return getComputedStyle(document.documentElement).getPropertyValue('--app-bg-accent').trim() || APP_CONFIG.theme.colors.accent
  }

  const seekTo = (frame: number) => {
    stopPlayback()
    setCurrentClipFrame(Math.min(Math.max(frame, clipStart), clipEnd))
  }
  const seekToEvent = (event: Event) => seekTo(event.frame_start)

  const hiddenCount = timelines.filter((timeline) => timeline.hidden).length

  return (
    <TimelineGroup
      title="Insights"
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((current) => !current)}
    >
      {timelines.length === 0 ? (
        <div className="annotation-timeline__empty">
          No tracks yet. Add them from <strong>Insights</strong> in the sidebar to see when events happened and how
          metrics moved.
        </div>
      ) : rows.length === 0 ? (
        <div className="annotation-timeline__empty">All tracks are hidden. Show them from Insights in the sidebar.</div>
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
          >
            {row.kind === 'lanes' ? (
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
            ) : (
              <MomentumTrack
                row={row}
                clipFrame={clipFrame}
                timelineTrackWidth={trackWidth}
                getTeamColor={getEventColor}
                getTeamName={getTeamName}
                onSeek={seekTo}
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
