import React, { useId, useRef } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import "./Settings.css";
import type { MatchData } from '../types/MatchDataInterfaces';
import { useStyleConfig } from '../context/StyleConfigContext';

type SettingsRowProps = {
    label: string;
    color: string | null;
    visible: boolean;
    onChange: (c: string) => void;
    onToggleVisibility?: (visible: boolean) => void;
};

const SettingsRow: React.FC<SettingsRowProps> = ({ label, color, visible, onChange, onToggleVisibility }) => {
    const id = useId();
    const pickerRef = useRef<HTMLInputElement | null>(null);

    const openPicker = () => pickerRef.current?.click();

    return (
        <div className="settings-row">
            <div className="settings-row-label">{label}</div>

            <div className="settings-row-control">
                <button
                    type="button"
                    className="settings-visibility-button"
                    onClick={() => onToggleVisibility?.(!visible)}
                    aria-pressed={!visible}
                    aria-label={visible ? 'Hide elements' : 'Show elements'}
                >
                    {visible ? <FaEye /> : <FaEyeSlash />}
                </button>
                {color && (
                    <button
                        type="button"
                        className="settings-color-circle"
                        style={{ backgroundColor: color }}
                        onClick={openPicker}
                        aria-label={`Selected color ${color}. Click to change`}>
                    </button>
                )}

                <input
                    ref={pickerRef}
                    id={`${id}-color`}
                    className="settings-color-input-hidden"
                    type="color"
                    value={color || '#000000'}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    aria-label={`Choose color for ${label}`}
                />
            </div>
        </div>
    );
};

const Settings: React.FC<{ matchData: MatchData | null }> = ({ matchData }) => {
    const {
        homeTeamColor,
        awayTeamColor,
        eventStyles,
        teamVisibility,
        eventVisibility,
        overlayVisibility,
        setHomeTeamColor,
        setAwayTeamColor,
        setEventStyleColor,
        setTeamVisibility,
        setEventVisibility,
        setOverlayVisibility,
    } = useStyleConfig();

    return (
        <div className="settings-display">
            <div className="settings-display-header">
                <span className="settings-kicker">Style Controls</span>
                <h3>Settings</h3>
            </div>
            <div className="settings-box settings-box--flat">
                <div className="settings-section-heading">Teams & Events</div>
                <SettingsRow label={`Home Team (${matchData?.home_team?.acronym ?? 'Home Team'})`} color={homeTeamColor} visible={teamVisibility.home} onChange={setHomeTeamColor} onToggleVisibility={(visible) => setTeamVisibility('home', visible)} />
                <SettingsRow label={`Away Team (${matchData?.away_team?.acronym ?? 'Away Team'})`} color={awayTeamColor} visible={teamVisibility.away} onChange={setAwayTeamColor} onToggleVisibility={(visible) => setTeamVisibility('away', visible)} />
                <SettingsRow label={'Player Possession'} color={eventStyles.playerPossession.color} visible={eventVisibility.playerPossession} onChange={(color) => setEventStyleColor('playerPossession', color)} onToggleVisibility={(visible) => setEventVisibility('playerPossession', visible)}/>
                <SettingsRow label={'Passing Options'} color={eventStyles.passingOption.color} visible={eventVisibility.passingOption} onChange={(color) => setEventStyleColor('passingOption', color)} onToggleVisibility={(visible) => setEventVisibility('passingOption', visible)}/>
                <SettingsRow label={'On Ball Engagement'} color={eventStyles.onBallEngagement.color} visible={eventVisibility.onBallEngagement} onChange={(color) => setEventStyleColor('onBallEngagement', color)} onToggleVisibility={(visible) => setEventVisibility('onBallEngagement', visible)}/>
                <SettingsRow label={'Off Ball Runs'} color={eventStyles.offBallRun.color} visible={eventVisibility.offBallRun} onChange={(color) => setEventStyleColor('offBallRun', color)} onToggleVisibility={(visible) => setEventVisibility('offBallRun', visible)}/>

            </div>
            <div className="settings-box settings-box--flat">
                <div className="settings-section-heading">Overlays</div>
                <SettingsRow label={'Passing Network'} color={null} visible={overlayVisibility.passing_network} onChange={setHomeTeamColor} onToggleVisibility={(visible) => setOverlayVisibility('passing_network', visible)} />

            </div>
        </div>
    );
};

export default Settings;