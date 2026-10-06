import { useState } from 'react'
import { GiAbstract006, GiFlagObjective, GiSoccerField, GiTargeting } from 'react-icons/gi'
import { useMatchSession } from '../context/MatchSessionContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import { OVERLAY_SEGMENT_LABELS, type OverlaySegmentKind } from '../types/ClipInterfaces'
import { findOverlayAt } from '../services/clipManager'
import EventVisualisationTab from './EventVisualisationTab'
import './TimelineTab.css'

type OverlaysTabProps = {
  keyMomentsData: KeyMomentsData | null
  matchData: MatchData | null
}

function OverlaysTab({
  keyMomentsData,
  matchData,
}: OverlaysTabProps) {
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false)
  // The overlay type whose last click was refused, so the reason can be shown.
  const [refusedKind, setRefusedKind] = useState<OverlaySegmentKind | null>(null)
  const { session, addOverlaySegmentFrom, toggleSelectedEvent, setSelectedEvents, setAutoDisappearEvents } = useMatchSession()
  const { clip, currentClipFrame } = session.playback

  const handleEventsSelect = () => {
    setIsEventsDropdownOpen((previousValue) => !previousValue)
  }

  const alreadyShowing = (kind: OverlaySegmentKind) => findOverlayAt(clip, kind, currentClipFrame) !== undefined
  const isAtClipEnd = currentClipFrame >= clip.length

  // Adds the overlay from the current clip frame to the end of the clip.
  const handleOverlaySegmentSelect = (kind: OverlaySegmentKind) => {
    if (alreadyShowing(kind) || isAtClipEnd) {
      setRefusedKind(kind)
      return
    }
    setRefusedKind(null)
    addOverlaySegmentFrom(kind, currentClipFrame)
  }

  // Derived from the current frame, so it clears itself once the playhead moves off the overlay.
  const refusalNotice =
    refusedKind === null
      ? null
      : alreadyShowing(refusedKind)
        ? `${OVERLAY_SEGMENT_LABELS[refusedKind]} already exists at this point in the clip.`
        : isAtClipEnd
          ? `There is no clip left after this frame to add ${OVERLAY_SEGMENT_LABELS[refusedKind]} to.`
          : null

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Overlays</h2>
      <p>Overlay controls will be added here.</p>
      <div className="timeline-add-menu">
        <div className="timeline-add-options overlays-options" aria-label="Overlay option types">
          <button
            type="button"
            className="app-header-action workspace-sidebar-action timeline-add-option"
            onClick={() => handleOverlaySegmentSelect('pitch')}
          >
            <GiSoccerField aria-hidden="true" />
            <span>Pitch</span>
          </button>
          <button
            type="button"
            className="app-header-action workspace-sidebar-action timeline-add-option"
            onClick={() => handleOverlaySegmentSelect('pitch_control')}
          >
            <GiAbstract006 aria-hidden="true" />
            <span>Pitch Control</span>
          </button>
          <button
            type="button"
            className="app-header-action workspace-sidebar-action timeline-add-option"
            onClick={() => handleOverlaySegmentSelect('pass_option_prob')}
          >
            <GiTargeting aria-hidden="true" />
            <span>Pass Probability</span>
          </button>
          <button
            type="button"
            className="app-header-action workspace-sidebar-action timeline-add-option"
            aria-expanded={isEventsDropdownOpen}
            aria-controls="events-overlay-panel"
            onClick={handleEventsSelect}
          >
            <GiFlagObjective aria-hidden="true" />
            <span>Events</span>
          </button>
        </div>

        {refusalNotice ? (
          <p className="overlays-notice" role="status">
            {refusalNotice}
          </p>
        ) : null}

        {isEventsDropdownOpen ? (
          <EventVisualisationTab
            keyMomentsData={keyMomentsData}
            matchData={matchData}
            selectedEvents={session.overlays.selectedEvents}
            onToggleEvent={toggleSelectedEvent}
            onSetSelectedEvents={setSelectedEvents}
            autoDisappearEvents={session.overlays.autoDisappearEvents}
            onToggleAutoDisappearEvents={setAutoDisappearEvents}
          />
        ) : null}
      </div>
    </div>
  )
}

export default OverlaysTab
