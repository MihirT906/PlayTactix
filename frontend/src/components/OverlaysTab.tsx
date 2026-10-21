import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { GiAbstract006, GiFlagObjective, GiHoneycomb, GiNodular, GiPathDistance, GiSoccerField, GiTargeting } from 'react-icons/gi'
import { useMatchSession } from '../context/MatchSessionContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import { OVERLAY_SEGMENT_LABELS, type OverlaySegmentKind } from '../types/ClipInterfaces'
import { findOverlayAt } from '../services/clipManager'
import { buildEventMapItems, resolveEventMap } from '../plot/overlays/eventMapOverlay'
import EventMapPanel from './EventMapPanel'
import PassNetworkPanel from './PassNetworkPanel'
import './TimelineTab.css'

type OverlaysTabProps = {
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

const OVERLAY_OPTIONS: { kind: OverlaySegmentKind; Icon: IconType }[] = [
  { kind: 'pitch', Icon: GiSoccerField },
  { kind: 'pitch_control', Icon: GiAbstract006 },
  { kind: 'pass_option_prob', Icon: GiTargeting },
  { kind: 'sequence_trails', Icon: GiPathDistance },
  { kind: 'voronoi', Icon: GiHoneycomb },
]

function OverlaysTab({
  keyMomentsData,
  matchData,
}: OverlaysTabProps) {
  // The overlay whose settings are open below the buttons, one at a time.
  const [openPanel, setOpenPanel] = useState<'event_map' | 'pass_network' | null>(null)
  // The overlay type whose last click was refused, so the reason can be shown.
  const [refusedKind, setRefusedKind] = useState<OverlaySegmentKind | null>(null)
  const { session, addOverlaySegmentFrom, endOverlaySegmentAt } = useMatchSession()
  const { clip, currentClipFrame } = session.playback

  const togglePanel = (panel: 'event_map' | 'pass_network') => {
    setOpenPanel((previousValue) => (previousValue === panel ? null : panel))
  }

  const isShowing = (kind: OverlaySegmentKind) => findOverlayAt(clip, kind, currentClipFrame) !== undefined
  const isAtClipEnd = currentClipFrame >= clip.length

  // The Event Map has no bar of its own; it counts as on while its filters draw anything.
  const eventMapItems = useMemo(() => buildEventMapItems(keyMomentsData?.events), [keyMomentsData])
  const eventMapCount = useMemo(
    () =>
      resolveEventMap(eventMapItems, session.overlays.eventMapFilters, session.overlays.eventMapExcludedIds, clip.matchSegments)
        .drawn.length,
    [eventMapItems, session.overlays.eventMapFilters, session.overlays.eventMapExcludedIds, clip.matchSegments],
  )

  // Each overlay turns on or off from the current frame: on runs it to the end of the clip (or the next
  // bar of its type), off ends the bar showing here.
  const handleOverlayToggle = (kind: OverlaySegmentKind) => {
    if (isShowing(kind)) {
      setRefusedKind(null)
      endOverlaySegmentAt(kind, currentClipFrame)
      return
    }
    if (isAtClipEnd) {
      setRefusedKind(kind)
      return
    }
    setRefusedKind(null)
    addOverlaySegmentFrom(kind, currentClipFrame)
  }

  // Derived from the current frame, so it clears itself once the playhead moves off the clip end.
  const refusalNotice =
    refusedKind !== null && isAtClipEnd && !isShowing(refusedKind)
      ? `There is no clip left after this frame to add ${OVERLAY_SEGMENT_LABELS[refusedKind]} to.`
      : null

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Overlays</h2>
      <p>Turn an overlay on or off from the current frame. Highlighted ones are showing now.</p>
      <div className="timeline-add-menu">
        <div className="timeline-add-options overlays-options" aria-label="Overlay option types">
          {OVERLAY_OPTIONS.map(({ kind, Icon }) => {
            const isOn = isShowing(kind)
            const label = OVERLAY_SEGMENT_LABELS[kind]
            return (
              <button
                key={kind}
                type="button"
                className={`app-header-action workspace-sidebar-action timeline-add-option${isOn ? ' is-active' : ''}`}
                aria-pressed={isOn}
                title={isOn ? `Turn ${label} off from this frame` : `Turn ${label} on from this frame`}
                onClick={() => handleOverlayToggle(kind)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
                {isOn ? <span className="overlay-option-state">On</span> : null}
              </button>
            )
          })}
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action timeline-add-option${eventMapCount > 0 ? ' is-active' : ''}`}
            aria-expanded={openPanel === 'event_map'}
            aria-controls="event-map-panel"
            title={eventMapCount > 0 ? `Drawing ${eventMapCount} events. Open to change the filters.` : 'Choose events to draw'}
            onClick={() => togglePanel('event_map')}
          >
            <GiFlagObjective aria-hidden="true" />
            <span>Event Map</span>
            {eventMapCount > 0 ? <span className="overlay-option-state">On</span> : null}
          </button>
          {/* The Pass Network has settings, so like the Event Map its button opens them; it is turned on and off from there. */}
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action timeline-add-option${isShowing('pass_network') ? ' is-active' : ''}`}
            aria-expanded={openPanel === 'pass_network'}
            aria-controls="pass-network-panel"
            title={isShowing('pass_network') ? 'Showing now. Open to change its settings.' : 'Open to set up and turn on'}
            onClick={() => togglePanel('pass_network')}
          >
            <GiNodular aria-hidden="true" />
            <span>{OVERLAY_SEGMENT_LABELS.pass_network}</span>
            {isShowing('pass_network') ? <span className="overlay-option-state">On</span> : null}
          </button>
        </div>

        {refusalNotice ? (
          <p className="overlays-notice" role="status">
            {refusalNotice}
          </p>
        ) : null}

        {openPanel === 'event_map' ? (
          <div id="event-map-panel">
            <EventMapPanel keyMomentsData={keyMomentsData} matchData={matchData} />
          </div>
        ) : null}

        {openPanel === 'pass_network' ? (
          <div id="pass-network-panel">
            <PassNetworkPanel
              keyMomentsData={keyMomentsData}
              matchData={matchData}
              isOn={isShowing('pass_network')}
              onToggle={() => handleOverlayToggle('pass_network')}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default OverlaysTab
