import { FaCog, FaSearch, FaStream } from 'react-icons/fa'
import './WorkspaceSidebar.css'
import Settings from './Settings.tsx'
import TimelineTab from './TimelineTab.tsx'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { KeyMomentsData } from '../types/KeyMomentsDataInterfaces'
import TimelineStore from '../services/TimelineStore'
import KeyMomentFinderComponent from './KeyMomentFinderComponent'

export type SidebarPanel = 'settings' | 'timeline' | 'search' | null

type WorkspaceSidebarProps = {
  activePanel: SidebarPanel
  onActivePanelChange: (panel: SidebarPanel) => void
  matchData: MatchData | null
  timelineStore: TimelineStore
  episodeRange: { start: number; end: number }
  onAddCustomEpisodeRange: (start: number, end: number) => void
  keyMomentsData: KeyMomentsData | null
}

function WorkspaceSidebar({
  activePanel,
  onActivePanelChange,
  matchData,
  timelineStore,
  episodeRange,
  onAddCustomEpisodeRange,
  keyMomentsData,
}: WorkspaceSidebarProps) {
  const isSettingsPanelOpen = activePanel === 'settings'
  const isTimelinePanelOpen = activePanel === 'timeline'
  const isSearchPanelOpen = activePanel === 'search'
  const isSidebarPanelOpen = activePanel !== null

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
        </nav>
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
      ) : null}
    </aside>
  )
}

export default WorkspaceSidebar