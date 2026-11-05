import type { ComponentType } from 'react'
import ChoosingAMatch from './ChoosingAMatch'
import KeyMoments from './KeyMoments'
import Overlays from './Overlays'
import PlaybackAndTheTimeline from './PlaybackAndTheTimeline'
import QuickStart from './QuickStart'
import TheWorkspace from './TheWorkspace'

// The body of each docs page, by slug. A page with no entry shows only its title.
export const DOCS_CONTENT: Partial<Record<string, ComponentType>> = {
  'quick-start': QuickStart,
  'choosing-a-match': ChoosingAMatch,
  'the-workspace': TheWorkspace,
  'playback-and-the-timeline': PlaybackAndTheTimeline,
  'key-moments': KeyMoments,
  overlays: Overlays,
}
