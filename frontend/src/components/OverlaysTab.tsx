import { useState } from 'react'
import { FaPlus, FaCalendarAlt } from 'react-icons/fa'
import { GiSoccerField } from 'react-icons/gi'
import { useMatchSession } from '../context/MatchSessionContext'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
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
  const { session, setActiveBackground, toggleSelectedEvent, setSelectedEvents, setAutoDisappearEvents } = useMatchSession()
  const isPitchBackgroundActive = session.playback.clip.overlaySegments.some((overlay) => overlay.type === 'pitch')

  const handleEventsSelect = () => {
    setIsEventsDropdownOpen((previousValue) => !previousValue)
    setIsAddMenuOpen(false)
  }

  const handlePitchSelect = () => {
    setActiveBackground(isPitchBackgroundActive ? null : 'pitch')
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
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isPitchBackgroundActive ? 'is-active' : ''}`}
              onClick={handlePitchSelect}
            >
              <GiSoccerField aria-hidden="true" />
              <span>Pitch</span>
            </button>
            <button
              type="button"
              className={`app-header-action workspace-sidebar-action timeline-add-option ${isEventsDropdownOpen ? 'is-active' : ''}`}
              aria-expanded={isEventsDropdownOpen}
              aria-controls="events-overlay-panel"
              onClick={handleEventsSelect}
            >
              <FaCalendarAlt aria-hidden="true" />
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
