import { useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { GiSoccerField } from 'react-icons/gi'
import { useMatchSession } from '../context/MatchSessionContext'
import type AnnotationStore from '../services/AnnotationStore-optimized'
import './TimelineTab.css'

const PITCH_OVERLAY_LABEL = 'Pitch'

type OverlaysTabProps = {
  episodeRange: { start: number; end: number }
  annotationStore: AnnotationStore
  onAnnotationUpdate: () => void
}

function OverlaysTab({ episodeRange, annotationStore, onAnnotationUpdate }: OverlaysTabProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const { session, setActiveBackground } = useMatchSession()
  const isPitchBackgroundActive = session.background.active === 'pitch'

  const handlePitchSelect = () => {
    if (isPitchBackgroundActive) {
      annotationStore.removeOverlayAnnotation(PITCH_OVERLAY_LABEL)
      setActiveBackground(null)
    } else {
      annotationStore.addOverlayAnnotation(PITCH_OVERLAY_LABEL, episodeRange.start, episodeRange.end)
      setActiveBackground('pitch')
    }
    onAnnotationUpdate()
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
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default OverlaysTab
