export type TimelineFilterValue = string | number | boolean

export type TimelineFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'

export interface TimelineCondition {
  column: string
  operator: TimelineFilterOperator
  value: TimelineFilterValue
}

export interface FilterTimelineOption {
  id: string
  label: string
  kind: 'filter'
  condition: TimelineCondition
}

export interface MetricTimelineOption {
  id: string
  label: string
  kind: 'metric'
  column: string
  aggregation: string
}

export type TimelineOption = FilterTimelineOption | MetricTimelineOption