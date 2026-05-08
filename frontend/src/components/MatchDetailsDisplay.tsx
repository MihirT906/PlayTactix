import type { MatchData } from '../types/MatchDataInterfaces';
import './MatchDetailsDisplay.css'
import { useEffect } from 'react';
import { APP_CONFIG, THEME_CSS_VARIABLES } from '../config'
import { useStyleConfig } from '../context/StyleConfigContext';

const MatchDetailsDisplay = ({ matchData }: { matchData: MatchData | null }) => {
	const { homeTeamColor, awayTeamColor } = useStyleConfig();

    if (!matchData) {
        return null;
    }

    const homeScorers = matchData.players.filter(
        (player) => player.team_id === matchData.home_team.id && player.goal > 0,
    );

    const awayScorers = matchData.players.filter(
        (player) => player.team_id === matchData.away_team.id && player.goal > 0,
    );

    const matchDate = new Intl.DateTimeFormat('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(matchData.date_time));

    const renderScorers = (scorers: typeof homeScorers, accentClass: string) => (
        <div className={`scorers-panel ${accentClass}`}>
            {scorers.length > 0 ? (
                <ul className="players-list">
                    {scorers.map((player) => (
                        <li key={player.id} className="player-item">
                            <div className="player-meta">
                                <span className="player-name">
                                    {player.first_name} {player.last_name}
                                </span>
                                <span className="player-role">#{player.number} {player.player_role.acronym}</span>
                            </div>
                            <span className="goal-count">{player.goal}x</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="players-empty">No scorers recorded</p>
            )}
        </div>
    );

    useEffect(() => {
        const root = document.documentElement
        
        Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
              root.style.setProperty(variable, value)
            })
        
        document.title = APP_CONFIG.brand.title
    }, [])
    
    return (
        <div className="match-info"
            style={{
                "--home-color": homeTeamColor,
                "--away-color": awayTeamColor,

                boxShadow: `
                            inset 0 0 0 0 transparent,
                            0 4px 12px rgba(0,0,0,0.08)
                            `
            } as React.CSSProperties}>
            <div className="team-row">
                <div className="team-column team-home-column">
                    {renderScorers(homeScorers, 'home')}
                </div>
                <div className="match-summary">
                    <div className="team team-home">
                        <div className="team-shirt left">
                            <svg viewBox="0 0 64 64">
                                <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                            </svg>
                        </div>
                        <span className="team-name">{matchData.home_team.short_name}</span>
                    </div>
                    <div className="details"> 
                        <span className="competition-name">
                            {matchData.competition_edition.name}
                        </span>
                        <span className="vs">{matchData.home_team_score} - {matchData.away_team_score}</span>
                        <span className="match-round">{matchData.competition_round.name}</span>
                        <span className="venue">{matchDate}</span>
                        <span className="venue">{matchData.stadium.name}, {matchData.stadium.city}</span>
                    </div>
                    <div className="team team-away">
                        <div className="team-shirt right">
                            <svg viewBox="0 0 64 64">
                                <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                            </svg>
                        </div>
                        <span className="team-name">{matchData.away_team.short_name}</span>
                    </div>
                </div>
                <div className="team-column team-away-column">
                    {renderScorers(awayScorers, 'away')}
                </div>
            </div>
        </div>
        )
}


export default MatchDetailsDisplay;