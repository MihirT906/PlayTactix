import type { ComponentType } from 'react'
import Annotations from './Annotations'
import ChoosingAMatch from './ChoosingAMatch'
import ClipsAndSegments from './ClipsAndSegments'
import KeyMoments from './KeyMoments'
import Overlays from './Overlays'
import PlaybackAndTheTimeline from './PlaybackAndTheTimeline'
import TheWorkspace from './TheWorkspace'
import WhatIsTappd from './WhatIsTappd'

// The body of each docs page, by slug. A page with no entry shows only its title.
export const DOCS_CONTENT: Partial<Record<string, ComponentType>> = {
  'choosing-a-match': ChoosingAMatch,
  'the-workspace': TheWorkspace,
  'playback-and-the-timeline': PlaybackAndTheTimeline,
  'key-moments': KeyMoments,
  overlays: Overlays,
  'clips-and-segments': ClipsAndSegments,
  annotations: Annotations,
  'what-is-tappd': WhatIsTappd,
}
