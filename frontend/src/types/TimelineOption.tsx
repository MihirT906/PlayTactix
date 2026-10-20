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
  hidden?: boolean
}

export type AggregationMethod = 'max' | 'average' | 'latest' | 'band'

export interface MetricTimelineOption {
  id: string
  label: string
  kind: 'metric'
  column: string
  aggregation: AggregationMethod
  hidden?: boolean
}

// The clip's phases of play, as blocks coloured by the team in possession.
export interface PhasesTimelineOption {
  id: string
  label: string
  kind: 'phases'
  hidden?: boolean
}

export type TimelineOption = FilterTimelineOption | MetricTimelineOption | PhasesTimelineOption

// Narrows the event tracks to one team and, optionally, some of its players. Metric and phase
// tracks are left whole.
export interface InsightFilter {
  // Null means both teams.
  teamId: number | null
  // Empty means every player.
  playerIds: number[]
}
