import { useEffect, useMemo, useState } from 'react'
import { FaChartLine, FaChevronDown, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa'
import TimelineStore from '../services/TimelineStore'
import { getClipEvents, matchesFilterTimeline } from '../services/timelineEvents'
import { EVENT_TYPES, formatEventValue } from '../constants/eventData'
import type { Event } from '../types/FrameDataInterfaces'
import type { AggregationMethod, FilterTimelineOption, TimelineOption } from '../types/TimelineOption'
import './TimelineTab.css'

type SelectOption = {
  value: string
  label: string
}

type MetricColumnOption = SelectOption & { aggregation: AggregationMethod }

const metricColumnOptions: MetricColumnOption[] = [
  { value: 'xpass_completion', label: 'xpass_completion', aggregation: 'average' },
  { value: 'xthreat', label: 'xthreat', aggregation: 'max' },
  { value: 'xloss_player_possession', label: 'xloss_player_possession', aggregation: 'band' },
  { value: 'xshot_player_possession', label: 'xshot_player_possession', aggregation: 'band' },
]

type TimelineTabProps = {
  timelineStore: TimelineStore
  eventsData: Map<number, Event[]> | null
  clipRange: { start: number; end: number }
  segmentStart: number
}

function TimelineTab({ timelineStore, eventsData, clipRange, segmentStart }: TimelineTabProps) {
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [selectedMetricColumn, setSelectedMetricColumn] = useState('')
  const [timelines, setTimelines] = useState<TimelineOption[]>(timelineStore.getAll())

  useEffect(() => timelineStore.subscribe(setTimelines), [timelineStore])

  // Subtypes are read from the loaded events rather than hardcoded per event type.
  const subtypesByEventType = useMemo(() => {
    const subtypes = new Map<string, Set<string>>()

    for (const frameEvents of eventsData?.values() ?? []) {
      for (const event of frameEvents) {
        if (!event.event_subtype) continue
        if (!subtypes.has(event.event_type)) subtypes.set(event.event_type, new Set())
        subtypes.get(event.event_type)!.add(event.event_subtype)
      }
    }

    return subtypes
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

  const handleSaveMetricTimeline = () => {
    const metricColumn = metricColumnOptions.find((option) => option.value === selectedMetricColumn)
    if (!metricColumn) {
      return
    }

    timelineStore.add({
      kind: 'metric',
      label: metricColumn.label,
      column: metricColumn.value,
      aggregation: metricColumn.aggregation,
    })
    setSelectedMetricColumn('')
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
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Timeline</h2>
      <section className="timeline-section" aria-labelledby="timeline-tracks-heading">
        <h3 id="timeline-tracks-heading" className="timeline-section-label">
          Tracks
        </h3>
        {timelines.length > 0 ? (
          <ul className="timeline-track-list">
            {timelines.map((timeline) =>
              timeline.kind === 'filter' ? (
                renderFilterTrack(timeline)
              ) : (
                <li key={timeline.id} className={`timeline-track${timeline.hidden ? ' is-hidden' : ''}`}>
                  <div className="timeline-track-header">
                    <span className="timeline-track-toggle timeline-track-toggle--static">
                      <FaChartLine aria-hidden="true" />
                      <span className="timeline-track-label">{timeline.label}</span>
                    </span>
                    {renderTrackActions(timeline)}
                  </div>
                </li>
              ),
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
        <div className="timeline-option-form">
          <select
            aria-label="Metric"
            value={selectedMetricColumn}
            onChange={(event) => setSelectedMetricColumn(event.target.value)}
          >
            <option value="" disabled>
              Select metric
            </option>
            {metricColumnOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="timeline-save-button"
            onClick={handleSaveMetricTimeline}
            disabled={!selectedMetricColumn}
          >
            Add
          </button>
        </div>
      </section>
    </div>
  )
}

export default TimelineTab
