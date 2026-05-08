import React, { useId, useRef, useState } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import "./Settings.css";
import type { MatchData } from '../types/MatchDataInterfaces';
import { useStyleConfig } from '../context/StyleConfigContext';

type SettingsRowProps = {
    label: string;
    color: string;
    onChange: (c: string) => void;
    onToggleVisibility?: (visible: boolean) => void;
};

const SettingsRow: React.FC<SettingsRowProps> = ({ label, color, onChange, onToggleVisibility }) => {
    const id = useId();
    const pickerRef = useRef<HTMLInputElement | null>(null);
    const [visible, setVisible] = useState(true);

    const openPicker = () => pickerRef.current?.click();

    return (
        <div className="settings-row">
            <div className="settings-row-label">{label}</div>

            <div className="settings-row-control">
                <button
                    type="button"
                    className="settings-visibility-button"
                    onClick={() => {
                        const next = !visible;
                        setVisible(next);
                        if (onToggleVisibility) onToggleVisibility(next);
                    }}
                    aria-pressed={!visible}
                    aria-label={visible ? 'Hide elements' : 'Show elements'}
                >
                    {visible ? <FaEye /> : <FaEyeSlash />}
                </button>
                <button
                    type="button"
                    className="settings-color-circle"
                    style={{ backgroundColor: color }}
                    onClick={openPicker}
                    aria-label={`Selected color ${color}. Click to change`}>
                </button>

                <input
                    ref={pickerRef}
                    id={`${id}-color`}
                    className="settings-color-input-hidden"
                    type="color"
                    value={color}
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
        setHomeTeamColor,
        setAwayTeamColor,
        setEventStyleColor,
    } = useStyleConfig();

    return (
        <div className="settings-display">
            <div className="settings-box settings-box--flat">
                <SettingsRow label={`${matchData?.home_team?.name ?? 'Home Team'} Color`} color={homeTeamColor} onChange={setHomeTeamColor} />
                <SettingsRow label={`${matchData?.away_team?.name ?? 'Away Team'} Color`} color={awayTeamColor} onChange={setAwayTeamColor} />
                <SettingsRow label={'Player Possession'} color={eventStyles.playerPossession.color} onChange={(color) => setEventStyleColor('playerPossession', color)}/>
                <SettingsRow label={'Passing Options'} color={eventStyles.passingOption.color} onChange={(color) => setEventStyleColor('passingOption', color)}/>
                <SettingsRow label={'On Ball Engagement'} color={eventStyles.onBallEngagement.color} onChange={(color) => setEventStyleColor('onBallEngagement', color)}/>
                <SettingsRow label={'Off Ball Runs'} color={eventStyles.offBallRun.color} onChange={(color) => setEventStyleColor('offBallRun', color)}/>

            </div>
        </div>
    );
};

export default Settings;