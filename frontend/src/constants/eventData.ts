export type InPossessionPhaseType =
  | 'build_up'
  | 'create'
  | 'finish'
  | 'quick_break'
  | 'transition'
  | 'chaotic'
  | 'direct'
  | 'set_play'
  | 'disruption'

export type OutOfPossessionPhaseType =
  | 'chaotic'
  | 'low_block'
  | 'medium_block'
  | 'high_block'
  | 'defending_transition'
  | 'defending_quick_break'
  | 'defending_set_play'
  | 'disruption'
  | 'defending_direct'

export const IN_POSSESSION_PHASE_TYPES: InPossessionPhaseType[] = [
  'build_up',
  'create',
  'finish',
  'quick_break',
  'transition',
  'chaotic',
  'direct',
  'set_play',
  'disruption',
]

export const OUT_OF_POSSESSION_PHASE_TYPES: OutOfPossessionPhaseType[] = [
  'chaotic',
  'low_block',
  'medium_block',
  'high_block',
  'defending_transition',
  'defending_quick_break',
  'defending_set_play',
  'disruption',
  'defending_direct',
]

export type EventType = 'player_possession' | 'passing_option' | 'on_ball_engagement' | 'off_ball_run'

export const EVENT_TYPES: EventType[] = [
  'player_possession',
  'passing_option',
  'on_ball_engagement',
  'off_ball_run',
]

export const LEAD_TO_GOAL_VALUES = [true, false] as const
export const LEAD_TO_SHOT_VALUES = [true, false] as const

export const EVENT_SUBTYPES: string[] = [
  'behind',
  'coming_short',
  'cross_receiver',
  'dropping_off',
  'overlap',
  'pulling_half_space',
  'run_ahead_of_the_ball',
  'support',
  'underlap',
  'pressing',
  'pressure',
  'counter_press',
  'recovery_press',
  'other',
]

export const formatEventValue = (value: string | boolean): string => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
    .replace(/^defending_/, 'Def. ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
