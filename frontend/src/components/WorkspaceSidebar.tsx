import { FaCog } from 'react-icons/fa'
import './WorkspaceSidebar.css'
import Settings from './Settings.tsx'
import type { MatchData } from '../types/MatchDataInterfaces'

export type SidebarPanel = 'settings' | null

type WorkspaceSidebarProps = {
  activePanel: SidebarPanel
  onActivePanelChange: (panel: SidebarPanel) => void
  matchData: MatchData | null
}

function WorkspaceSidebar({ activePanel, onActivePanelChange, matchData }: WorkspaceSidebarProps) {
  const isSettingsPanelOpen = activePanel === 'settings'
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
        </nav>
      </div>
      {isSettingsPanelOpen ? (
        <div id="settings-sidebar-panel" className="settings-sidebar-panel">
          <Settings matchData={matchData} />
        </div>
      ) : null}
    </aside>
  )
}

export default WorkspaceSidebar