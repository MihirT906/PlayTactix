import React, { useId, useRef, useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import "./Settings.css";
import type { MatchData } from '../types/MatchDataInterfaces';
import { APP_CONFIG, SELECTED_POINTS_OPACITY, UNSELECTED_POINTS_OPACITY, THEME_CSS_VARIABLES } from '../config'

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
    const [homeColor, setHomeColor] = useState<string>("#F27805");
    const [awayColor, setAwayColor] = useState<string>("#2563EB");

    useEffect(() => {
        if (!matchData) return;
        const h = (matchData as any).home_team_kit?.jersey_color;
        const a = (matchData as any).away_team_kit?.jersey_color;
        if (typeof h === 'string' && h.length) setHomeColor(h.toUpperCase());
        if (typeof a === 'string' && a.length) setAwayColor(a.toUpperCase());
    }, [matchData]);

    return (
        <div className="settings-display">
            <div className="settings-box settings-box--flat">
                <SettingsRow label={`${matchData?.home_team?.name ?? 'Home Team'} Color`} color={homeColor} onChange={setHomeColor} />
                <SettingsRow label={`${matchData?.away_team?.name ?? 'Away Team'} Color`} color={awayColor} onChange={setAwayColor} />
                <SettingsRow label={'Player Possession'} color={APP_CONFIG.events.playerPossession.color} onChange={()=>{}}/>
                <SettingsRow label={'Passing Options'} color={APP_CONFIG.events.passingOption.color} onChange={()=>{}}/>
                <SettingsRow label={'On Ball Engagement'} color={APP_CONFIG.events.onBallEngagement.color} onChange={()=>{}}/>
                <SettingsRow label={'Off Ball Runs'} color={APP_CONFIG.events.offBallRun.color} onChange={()=>{}}/>

            </div>
        </div>
    );
};

export default Settings;