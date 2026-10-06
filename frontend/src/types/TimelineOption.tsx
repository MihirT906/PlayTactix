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

export type TimelineOption = FilterTimelineOption | MetricTimelineOption
