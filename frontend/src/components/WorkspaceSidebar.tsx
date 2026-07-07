import { FaCog, FaSearch, FaStream, FaStreetView, FaProjectDiagram, FaVectorSquare, FaSlash } from 'react-icons/fa'
import { FaCircleNodes } from "react-icons/fa6";
import { BiAddToQueue } from "react-icons/bi";
import './WorkspaceSidebar.css'
import Settings from './Settings.tsx'
import TimelineTab from './TimelineTab.tsx'
import OverlaysTab from './OverlaysTab.tsx'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import TimelineStore from '../services/TimelineStore'
import KeyMomentFinderComponent from './KeyMomentFinderComponent'
import { useMatchSession } from '../context/MatchSessionContext'
import type AnnotationStore from '../services/AnnotationStore-optimized'

export type SidebarPanel = 'settings' | 'timeline' | 'search' | 'overlays' | null

type WorkspaceSidebarProps = {
  activePanel: SidebarPanel
  onActivePanelChange: (panel: SidebarPanel) => void
  matchData: MatchData | null
  timelineStore: TimelineStore
  episodeRange: { start: number; end: number }
  onAddCustomEpisodeRange: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
  annotationStore: AnnotationStore
  onAnnotationUpdate: () => void
}

function WorkspaceSidebar({
  activePanel,
  onActivePanelChange,
  matchData,
  timelineStore,
  episodeRange,
  onAddCustomEpisodeRange,
  keyMomentsData,
  annotationStore,
  onAnnotationUpdate,
}: WorkspaceSidebarProps) {
  const { session, setEditMode } = useMatchSession()
  const isSettingsPanelOpen = activePanel === 'settings'
  const isTimelinePanelOpen = activePanel === 'timeline'
  const isSearchPanelOpen = activePanel === 'search'
  const isOverlaysPanelOpen = activePanel === 'overlays'
  const isSidebarPanelOpen = activePanel !== null
  const isPlayerFocusActive = session.ui.editMode === 'player_focus'
  const isDrawLinePlayersActive = session.ui.editMode === 'draw_line_players'
  const isDrawRectActive = session.ui.editMode === 'draw_rect'
  const isDrawLineActive = session.ui.editMode === 'draw_line'

  return (
    <aside className={`left-panel settings-sidebar ${isSidebarPanelOpen ? 'is-open' : ''}`} aria-label="Settings sidebar">
      <div className="settings-sidebar-rail">
        <span className="app-kicker workspace-sidebar-kicker">Navigation</span>
        <nav className="settings-sidebar-nav" aria-label="Primary workspace actions">
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action ${isSettingsPanelOpen ? 'is-active' : ''}`}
            onClick={() => onActivePanelChange(isSettingsPanelOpen ? null : 'settings')}
            aria-expanded={isSettingsPanelOpen}
            aria-controls="settings-sidebar-panel"
            aria-label={isSettingsPanelOpen ? 'Close settings panel' : 'Open settings panel'}
          >
            <FaCog aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action ${isTimelinePanelOpen ? 'is-active' : ''}`}
            onClick={() => onActivePanelChange(isTimelinePanelOpen ? null : 'timeline')}
            aria-expanded={isTimelinePanelOpen}
            aria-controls="timeline-sidebar-panel"
            aria-label={isTimelinePanelOpen ? 'Close timeline panel' : 'Open timeline panel'}
          >
            <FaStream aria-hidden="true" />
            <span>Timeline</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action ${isSearchPanelOpen ? 'is-active' : ''}`}
            onClick={() => onActivePanelChange(isSearchPanelOpen ? null : 'search')}
            aria-expanded={isSearchPanelOpen}
            aria-controls="search-sidebar-panel"
            aria-label={isSearchPanelOpen ? 'Close key moments panel' : 'Open key moments panel'}
          >
            <FaSearch aria-hidden="true" />
            <span>Search</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action ${isOverlaysPanelOpen ? 'is-active' : ''}`}
            onClick={() => onActivePanelChange(isOverlaysPanelOpen ? null : 'overlays')}
            aria-expanded={isOverlaysPanelOpen}
            aria-controls="overlays-sidebar-panel"
            aria-label={isOverlaysPanelOpen ? 'Close overlays panel' : 'Open overlays panel'}
          >
            <BiAddToQueue aria-hidden="true" />
            <span>Overlays</span>
          </button>
        </nav>
        <span className="app-kicker workspace-sidebar-kicker">Controls</span>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action workspace-sidebar-action--player-focus ${isPlayerFocusActive ? 'is-active' : ''}`}
            onClick={() => setEditMode(isPlayerFocusActive ? null : 'player_focus')}
            aria-pressed={isPlayerFocusActive}
            aria-label={isPlayerFocusActive ? 'Disable player focus mode' : 'Enable player focus mode'}
          >
            <FaStreetView aria-hidden="true" />
            <span>Player Focus</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action workspace-sidebar-action--draw-line ${isDrawLinePlayersActive ? 'is-active' : ''}`}
            onClick={() => setEditMode(isDrawLinePlayersActive ? null : 'draw_line_players')}
            aria-pressed={isDrawLinePlayersActive}
            aria-label={isDrawLinePlayersActive ? 'Disable link players mode' : 'Enable link players mode'}
          >
            <FaProjectDiagram aria-hidden="true" />
            <span>Link Players</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action workspace-sidebar-action--draw-rect ${isDrawRectActive ? 'is-active' : ''}`}
            onClick={() => setEditMode(isDrawRectActive ? null : 'draw_rect')}
            aria-pressed={isDrawRectActive}
            aria-label={isDrawRectActive ? 'Disable draw rectangle mode' : 'Enable draw rectangle mode'}
          >
            <FaVectorSquare aria-hidden="true" />
            <span>Draw Rectangle</span>
          </button>
          <button
            type="button"
            className={`app-header-action workspace-sidebar-action workspace-sidebar-action--draw-line-shape ${isDrawLineActive ? 'is-active' : ''}`}
            onClick={() => setEditMode(isDrawLineActive ? null : 'draw_line')}
            aria-pressed={isDrawLineActive}
            aria-label={isDrawLineActive ? 'Disable draw line mode' : 'Enable draw line mode'}
          >
            <FaSlash aria-hidden="true" />
            <span>Draw Line</span>
          </button>
      </div>
      {isSettingsPanelOpen ? (
        <div id="settings-sidebar-panel" className="settings-sidebar-panel">
          <Settings matchData={matchData} />
        </div>
      ) : isTimelinePanelOpen ? (
        <div id="timeline-sidebar-panel" className="settings-sidebar-panel timeline-sidebar-panel">
          <TimelineTab timelineStore={timelineStore} />
        </div>
      ) : isSearchPanelOpen ? (
        <div id="search-sidebar-panel" className="settings-sidebar-panel">
          <KeyMomentFinderComponent
            episodeRange={episodeRange}
            onAddCustomEpisodeRange={onAddCustomEpisodeRange}
            keyMomentsData={keyMomentsData}
            matchData={matchData}
          />
        </div>
      ) : isOverlaysPanelOpen ? (
        <div id="overlays-sidebar-panel" className="settings-sidebar-panel">
          <OverlaysTab
            episodeRange={episodeRange}
            annotationStore={annotationStore}
            onAnnotationUpdate={onAnnotationUpdate}
          />
        </div>
      ) : null}
    </aside>
  )
}

export default WorkspaceSidebar