import { useEffect, useMemo, useState } from 'react'
import { FaChartLine, FaChevronDown, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa'
import TimelineStore from '../services/TimelineStore'
import { useMatchSession } from '../context/MatchSessionContext'
import {
  HEIGHT_COLUMNS,
  METRIC_GRAPHS,
  getClipEvents,
  getEventMetricValue,
  getMetricDescription,
  getMetricGraph,
  getMetricLabel,
  describeTrackFilter,
  getTrackLabel,
  matchesFilterTimeline,
  type MetricGraph,
} from '../services/timelineEvents'
import { EVENT_TYPES, formatEventValue } from '../constants/eventData'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FilterTimelineOption, MetricTimelineOption, TimelineOption } from '../types/TimelineOption'
import { TrackFilter } from './TrackFilter'
import './TimelineTab.css'

type TimelineTabProps = {
  timelineStore: TimelineStore
  /** Every event of the match; the ones in the clip are found through its match segments. */
  matchEvents: Event[] | null
  matchData: MatchData | null
}

/**
 * The Insights panel, where everything about the Insights rows under the pitch is set: which tracks
 * there are and how each is drawn, including the team and players each event track is narrowed to.
 */
function TimelineTab({ timelineStore, matchEvents, matchData }: TimelineTabProps) {
  const { session } = useMatchSession()
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())
  const matchSegments = session.playback.clip.matchSegments

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])

  // Subtypes, and the columns that can set bar height, are read from the match's events rather than
  // hardcoded per event type.
  const { subtypesByEventType, heightColumnsByEventType } = useMemo(() => {
    const subtypes = new Map<string, Set<string>>()
    const heightColumns = new Map<string, Set<string>>()

    for (const event of matchEvents ?? []) {
      for (const column of HEIGHT_COLUMNS) {
        if (getEventMetricValue(event, column) == null) continue
        if (!heightColumns.has(event.event_type)) heightColumns.set(event.event_type, new Set())
        heightColumns.get(event.event_type)!.add(column)
      }

      if (!event.event_subtype) continue
      if (!subtypes.has(event.event_type)) subtypes.set(event.event_type, new Set())
      subtypes.get(event.event_type)!.add(event.event_subtype)
    }

    return { subtypesByEventType: subtypes, heightColumnsByEventType: heightColumns }
  }, [matchEvents])

  const clipEvents = useMemo(() => getClipEvents(matchEvents, matchSegments), [matchEvents, matchSegments])

  // Counted as a track would show them; `track` narrows them to its team and players.
  const countClipEvents = (
    eventType: string,
    subtypes: string[],
    track?: Pick<FilterTimelineOption, 'teamId' | 'playerIds'>,
  ) => clipEvents.filter((event) => matchesFilterTimeline({ eventType, subtypes, ...track }, event)).length

  const getTeamName = (teamId: number) =>
    teamId === matchData?.home_team.id
      ? matchData.home_team.short_name
      : teamId === matchData?.away_team.id
        ? matchData.away_team.short_name
        : 'Unknown team'
  const getPlayerName = (playerId: number) =>
    matchData?.players.find((player) => player.id === playerId)?.short_name ?? `Player ${playerId}`

  const handleAddFilterTimeline = (eventType: string) => {
    const timeline = timelineStore.add({ kind: 'filter', eventType })
    setExpandedTimelineId(timeline.id)
  }

  const handleToggleSubtype = (timeline: FilterTimelineOption, subtype: string) => {
    const subtypes = timeline.subtypes.includes(subtype)
      ? timeline.subtypes.filter((selected) => selected !== subtype)
      : [...timeline.subtypes, subtype]

    timelineStore.updateFilter(timeline.id, { subtypes })
  }

  const handleToggleMetric = (graph: MetricGraph) => {
    const timeline = timelineStore.toggleMetric({ label: graph.label, column: graph.id })
    if (timeline) setExpandedTimelineId(timeline.id)
  }

  const renderTrackActions = (timeline: TimelineOption) => (
    <>
      <button
        type="button"
        className="timeline-track-icon-button"
        onClick={() => timelineStore.setHidden(timeline.id, !timeline.hidden)}
        aria-label={`${timeline.hidden ? 'Show' : 'Hide'} ${getTrackLabel(timeline)}`}
        aria-pressed={Boolean(timeline.hidden)}
      >
        {timeline.hidden ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="timeline-track-icon-button"
        onClick={() => timelineStore.remove(timeline.id)}
        aria-label={`Remove ${getTrackLabel(timeline)}`}
      >
        <FaTimes aria-hidden="true" />
      </button>
    </>
  )

  const renderFilterTrack = (timeline: FilterTimelineOption) => {
    const isExpanded = expandedTimelineId === timeline.id
    // Picked subtypes stay listed even when the loaded events no longer contain them.
    const subtypes = Array.from(
      new Set([...(subtypesByEventType.get(timeline.eventType) ?? []), ...timeline.subtypes]),
    ).sort()
    const heightColumns = HEIGHT_COLUMNS.filter(
      (column) => heightColumnsByEventType.get(timeline.eventType)?.has(column) || timeline.heightBy === column,
    )
    const filterLabel = describeTrackFilter(timeline, getTeamName, getPlayerName)
    const trackLabel = filterLabel ? `${timeline.label} · ${filterLabel}` : timeline.label

    return (
      <li key={timeline.id} className={`timeline-track${timeline.hidden ? ' is-hidden' : ''}`}>
        <div className="timeline-track-header">
          <button
            type="button"
            className="timeline-track-toggle"
            onClick={() => setExpandedTimelineId(isExpanded ? null : timeline.id)}
            aria-expanded={isExpanded}
          >
            <FaChevronDown className={`timeline-track-chevron${isExpanded ? ' is-open' : ''}`} aria-hidden="true" />
            <span className="timeline-track-label">{trackLabel}</span>
            <span className="timeline-track-count">{countClipEvents(timeline.eventType, timeline.subtypes, timeline)}</span>
          </button>
          {renderTrackActions(timeline)}
        </div>
        {isExpanded ? (
          <div className="timeline-track-body">
            <TrackFilter
              timeline={timeline}
              onChange={(changes) => timelineStore.updateFilter(timeline.id, changes)}
              matchData={matchData}
              trackEvents={clipEvents.filter((event) =>
                matchesFilterTimeline({ eventType: timeline.eventType, subtypes: timeline.subtypes }, event),
              )}
            />
            {subtypes.length > 0 ? (
              <>
                <div className="timeline-chip-group" role="group" aria-label={`${timeline.label} subtypes`}>
                  <button
                    type="button"
                    className="timeline-chip"
                    aria-pressed={timeline.subtypes.length === 0}
                    onClick={() => timelineStore.updateFilter(timeline.id, { subtypes: [] })}
                  >
                    All
                  </button>
                  {subtypes.map((subtype) => (
                    <button
                      key={subtype}
                      type="button"
                      className="timeline-chip"
                      aria-pressed={timeline.subtypes.includes(subtype)}
                      onClick={() => handleToggleSubtype(timeline, subtype)}
                    >
                      {formatEventValue(subtype)}
                      <span className="timeline-chip-count">{countClipEvents(timeline.eventType, [subtype], timeline)}</span>
                    </button>
                  ))}
                </div>
                <label className="timeline-track-split">
                  <input
                    type="checkbox"
                    checked={timeline.splitBySubtype}
                    onChange={(event) => timelineStore.updateFilter(timeline.id, { splitBySubtype: event.target.checked })}
                  />
                  <span>One row per subtype</span>
                </label>
              </>
            ) : (
              <p className="timeline-track-note">No subtypes for this event type.</p>
            )}
            {heightColumns.length > 0 ? (
              <div className="timeline-track-field">
                <span className="timeline-track-field-label">Bar height</span>
                <div className="timeline-chip-group" role="group" aria-label={`${timeline.label} bar height`}>
                  <button
                    type="button"
                    className="timeline-chip"
                    aria-pressed={!timeline.heightBy}
                    onClick={() => timelineStore.updateFilter(timeline.id, { heightBy: null })}
                  >
                    Fixed
                  </button>
                  {heightColumns.map((column) => (
                    <button
                      key={column}
                      type="button"
                      className="timeline-chip"
                      aria-pressed={timeline.heightBy === column}
                      onClick={() => timelineStore.updateFilter(timeline.id, { heightBy: column })}
                      title={getMetricDescription(column)}
                    >
                      {getMetricLabel(column)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </li>
    )
  }

  const renderMetricTrack = (timeline: MetricTimelineOption) => {
    const isExpanded = expandedTimelineId === timeline.id
    const description = getMetricGraph(timeline.column)?.description
    const label = getTrackLabel(timeline)

    return (
      <li key={timeline.id} className={`timeline-track${timeline.hidden ? ' is-hidden' : ''}`}>
        <div className="timeline-track-header">
          <button
            type="button"
            className="timeline-track-toggle"
            onClick={() => setExpandedTimelineId(isExpanded ? null : timeline.id)}
            aria-expanded={isExpanded}
          >
            <FaChevronDown className={`timeline-track-chevron${isExpanded ? ' is-open' : ''}`} aria-hidden="true" />
            <span className="timeline-track-label" title={description}>
              {label}
            </span>
            <FaChartLine aria-hidden="true" />
          </button>
          {renderTrackActions(timeline)}
        </div>
        {isExpanded ? (
          <div className="timeline-track-body">
            <p className="timeline-track-note">{description}</p>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Insights</h2>
      <section className="timeline-section" aria-labelledby="timeline-tracks-heading">
        <h3 id="timeline-tracks-heading" className="timeline-section-label">
          Tracks
        </h3>
        {timelines.length > 0 ? (
          <ul className="timeline-track-list">
            {timelines.map((timeline) =>
              timeline.kind === 'filter' ? renderFilterTrack(timeline) : renderMetricTrack(timeline),
            )}
          </ul>
        ) : (
          <p className="timeline-track-note">No tracks yet. Add events or a metric below.</p>
        )}
      </section>
      <section className="timeline-section" aria-labelledby="timeline-add-events-heading">
        <h3 id="timeline-add-events-heading" className="timeline-section-label">
          Add events
        </h3>
        <div className="timeline-chip-group">
          {EVENT_TYPES.map((eventType) => (
            <button
              key={eventType}
              type="button"
              className="timeline-chip"
              onClick={() => handleAddFilterTimeline(eventType)}
            >
              {formatEventValue(eventType)}
              <span className="timeline-chip-count">{countClipEvents(eventType, [])}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="timeline-section" aria-labelledby="timeline-add-metric-heading">
        <h3 id="timeline-add-metric-heading" className="timeline-section-label">
          Add metric
        </h3>
        <div className="timeline-chip-group">
          {METRIC_GRAPHS.map((graph) => (
            <button
              key={graph.id}
              type="button"
              className="timeline-chip"
              aria-pressed={timelines.some((timeline) => timeline.kind === 'metric' && timeline.column === graph.id)}
              onClick={() => handleToggleMetric(graph)}
              title={graph.description}
            >
              {graph.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default TimelineTab
