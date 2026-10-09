import { useEffect, useMemo, useState } from 'react'
import { FaChartLine, FaChevronDown, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa'
import TimelineStore from '../services/TimelineStore'
import { HEIGHT_COLUMNS, getClipEvents, getEventMetricValue, matchesFilterTimeline } from '../services/timelineEvents'
import { EVENT_TYPES, formatEventValue } from '../constants/eventData'
import type { Event } from '../types/FrameDataInterfaces'
import type { AggregationMethod, FilterTimelineOption, MetricTimelineOption, TimelineOption } from '../types/TimelineOption'
import './TimelineTab.css'

type MetricDefinition = {
  column: string
  label: string
  aggregation: AggregationMethod
}

const METRICS: MetricDefinition[] = [
  { column: 'xpass_completion', label: 'xpass_completion', aggregation: 'average' },
  { column: 'xthreat', label: 'xthreat', aggregation: 'max' },
  { column: 'xloss_player_possession', label: 'xloss_player_possession', aggregation: 'band' },
  { column: 'xshot_player_possession', label: 'xshot_player_possession', aggregation: 'band' },
]

// Band metrics are drawn per possession, so only line metrics offer a choice.
const LINE_AGGREGATIONS: { value: AggregationMethod; label: string; description: string }[] = [
  { value: 'max', label: 'Max', description: 'Highest value among the events active at each moment.' },
  { value: 'average', label: 'Average', description: 'Average value across the events active at each moment.' },
  { value: 'latest', label: 'Latest', description: 'Value of the most recently started event at each moment.' },
]

const BAND_DESCRIPTION = 'Start, end and peak value for each possession.'

type TimelineTabProps = {
  timelineStore: TimelineStore
  eventsData: Map<number, Event[]> | null
  clipRange: { start: number; end: number }
  segmentStart: number
}

function TimelineTab({ timelineStore, eventsData, clipRange, segmentStart }: TimelineTabProps) {
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])

  // Subtypes, and the columns that can set bar height, are read from the loaded events rather than
  // hardcoded per event type.
  const { subtypesByEventType, heightColumnsByEventType } = useMemo(() => {
    const subtypes = new Map<string, Set<string>>()
    const heightColumns = new Map<string, Set<string>>()

    for (const frameEvents of eventsData?.values() ?? []) {
      for (const event of frameEvents) {
        for (const column of HEIGHT_COLUMNS) {
          if (getEventMetricValue(event, column) == null) continue
          if (!heightColumns.has(event.event_type)) heightColumns.set(event.event_type, new Set())
          heightColumns.get(event.event_type)!.add(column)
        }

        if (!event.event_subtype) continue
        if (!subtypes.has(event.event_type)) subtypes.set(event.event_type, new Set())
        subtypes.get(event.event_type)!.add(event.event_subtype)
      }
    }

    return { subtypesByEventType: subtypes, heightColumnsByEventType: heightColumns }
  }, [eventsData])

  const clipEvents = useMemo(
    () => getClipEvents(eventsData, { start: clipRange.start, end: clipRange.end }, segmentStart),
    [eventsData, clipRange.start, clipRange.end, segmentStart],
  )

  const countClipEvents = (eventType: string, subtypes: string[]) =>
    clipEvents.filter((event) => matchesFilterTimeline({ eventType, subtypes }, event)).length

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

  const handleToggleMetric = (metric: MetricDefinition) => {
    const existing = timelines.filter((timeline) => timeline.kind === 'metric' && timeline.column === metric.column)

    if (existing.length > 0) {
      existing.forEach((timeline) => timelineStore.remove(timeline.id))
      return
    }

    const timeline = timelineStore.add({
      kind: 'metric',
      label: metric.label,
      column: metric.column,
      aggregation: metric.aggregation,
    })
    setExpandedTimelineId(timeline.id)
  }

  const renderTrackActions = (timeline: TimelineOption) => (
    <>
      <button
        type="button"
        className="timeline-track-icon-button"
        onClick={() => timelineStore.setHidden(timeline.id, !timeline.hidden)}
        aria-label={timeline.hidden ? `Show ${timeline.label}` : `Hide ${timeline.label}`}
        aria-pressed={Boolean(timeline.hidden)}
      >
        {timeline.hidden ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="timeline-track-icon-button"
        onClick={() => timelineStore.remove(timeline.id)}
        aria-label={`Remove ${timeline.label}`}
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
            <span className="timeline-track-label">{timeline.label}</span>
            <span className="timeline-track-count">{countClipEvents(timeline.eventType, timeline.subtypes)}</span>
          </button>
          {renderTrackActions(timeline)}
        </div>
        {isExpanded ? (
          <div className="timeline-track-body">
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
                      <span className="timeline-chip-count">{countClipEvents(timeline.eventType, [subtype])}</span>
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
                    >
                      {column}
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
    const isBand = timeline.aggregation === 'band'
    const description = isBand
      ? BAND_DESCRIPTION
      : LINE_AGGREGATIONS.find((option) => option.value === timeline.aggregation)?.description

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
            <span className="timeline-track-label">{timeline.label}</span>
            <FaChartLine aria-hidden="true" />
          </button>
          {renderTrackActions(timeline)}
        </div>
        {isExpanded ? (
          <div className="timeline-track-body">
            {isBand ? null : (
              <div className="timeline-chip-group" role="group" aria-label={`${timeline.label} aggregation`}>
                {LINE_AGGREGATIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="timeline-chip"
                    aria-pressed={timeline.aggregation === option.value}
                    onClick={() => timelineStore.updateMetric(timeline.id, { aggregation: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
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
          {METRICS.map((metric) => (
            <button
              key={metric.column}
              type="button"
              className="timeline-chip"
              aria-pressed={timelines.some((timeline) => timeline.kind === 'metric' && timeline.column === metric.column)}
              onClick={() => handleToggleMetric(metric)}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default TimelineTab
