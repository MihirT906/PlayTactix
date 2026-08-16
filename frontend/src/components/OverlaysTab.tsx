import { useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { GiAbstract006, GiFlagObjective, GiSoccerField, GiTargeting } from 'react-icons/gi'
import { useMatchSession } from '../context/MatchSessionContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { OverlaySegmentKind } from '../types/ClipInterfaces'
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
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isEventsDropdownOpen, setIsEventsDropdownOpen] = useState(false)
  const { session, setActiveOverlaySegment, toggleSelectedEvent, setSelectedEvents, setAutoDisappearEvents } = useMatchSession()

  const isOverlaySegmentActive = (kind: OverlaySegmentKind) =>
    session.playback.clip.overlaySegments.some((overlay) => overlay.type === kind)

  const handleEventsSelect = () => {
    setIsEventsDropdownOpen((previousValue) => !previousValue)
    setIsAddMenuOpen(false)
  }

  const handleOverlaySegmentSelect = (kind: OverlaySegmentKind) => {
    setActiveOverlaySegment(kind, !isOverlaySegmentActive(kind))
    setIsAddMenuOpen(false)
  }

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Overlays</h2>
      <p>Overlay controls will be added here.</p>
      <div className="timeline-add-menu">
        <button
          type="button"
          className="app-header-action workspace-sidebar-action"
          onClick={() => setIsAddMenuOpen((previousValue) => !previousValue)}
          aria-expanded={isAddMenuOpen}
          aria-controls="overlays-add-options"
        >
          <FaPlus aria-hidden="true" />
          <span>Add</span>
        </button>

        {isAddMenuOpen ? (
          <div id="overlays-add-options" className="timeline-add-options" aria-label="Overlay option types">
            <button
              type="button"
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isOverlaySegmentActive('pitch') ? 'is-active' : ''}`}
              onClick={() => handleOverlaySegmentSelect('pitch')}
            >
              <GiSoccerField aria-hidden="true" />
              <span>Pitch</span>
            </button>
            <button
              type="button"
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isOverlaySegmentActive('pitch_control') ? 'is-active' : ''}`}
              onClick={() => handleOverlaySegmentSelect('pitch_control')}
            >
              <GiAbstract006 aria-hidden="true" />
              <span>Pitch Control</span>
            </button>
            <button
              type="button"
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isOverlaySegmentActive('pass_option_prob') ? 'is-active' : ''}`}
              onClick={() => handleOverlaySegmentSelect('pass_option_prob')}
            >
              <GiTargeting aria-hidden="true" />
              <span>Pass Probability</span>
            </button>
            <button
              type="button"
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isEventsDropdownOpen ? 'is-active' : ''}`}
              aria-expanded={isEventsDropdownOpen}
              aria-controls="events-overlay-panel"
              onClick={handleEventsSelect}
            >
              <GiFlagObjective aria-hidden="true" />
              <span>Events</span>
            </button>
          </div>
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
