export interface FilterTimelineOption {
  id: string
  label: string
  kind: 'filter'
  eventType: string
  // Empty means every subtype of the event type.
  subtypes: string[]
  // Draws one row per subtype instead of a single merged row.
  splitBySubtype: boolean
  // Numeric event column whose value sets the height of each bar.
  heightBy?: string | null
  // Narrows the track to one team; null or absent means both.
  teamId?: number | null
  // Narrows the track to some players; empty or absent means every player.
  playerIds?: number[]
  hidden?: boolean
}

export interface MetricTimelineOption {
  id: string
  label: string
  kind: 'metric'
  // The id of the graph the track draws (see METRIC_GRAPHS).
  column: string
  hidden?: boolean
}

export type TimelineOption = FilterTimelineOption | MetricTimelineOption
