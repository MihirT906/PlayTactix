import type { MatchData } from '../types/MatchDataInterfaces';
import './MatchDetailsDisplay.css'
import type { CSSProperties } from 'react';
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

    const venueText = `${matchData.stadium.name}, ${matchData.stadium.city}`;
    const matchHeadline = `${matchData.competition_edition.name} ${matchData.competition_round.name}`;

    const renderScorers = (scorers: typeof homeScorers, accentClass: string, teamName: string) => (
        <div className={`scorers-panel ${accentClass}`}>
            <div className="scorers-panel-header">
                <h3>{teamName}</h3>
            </div>
            {scorers.length > 0 ? (
                <ul className="players-list">
                    {scorers.map((player) => (
                        <li key={player.id} className="player-item">
                            <span className="player-name" title={`${player.first_name} ${player.last_name}`}>
                                {player.first_name} {player.last_name}
                            </span>
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
            } as CSSProperties}>
            <div className="match-hero-layout">
                <div className="match-hero-copy">
                    {/* <div className="match-kicker">Featured Match</div> */}
                    <div className="match-title-block">
                        <h2 className="match-headline">{matchHeadline}</h2>
                        <div className="match-meta" aria-label="Competition and venue details">
                            <span>{matchDate}</span>
                            <span className="match-meta-separator" aria-hidden="true">/</span>
                            <span>{venueText}</span>
                        </div>
                    </div>
                    <div className="match-teams-showcase">
                        <div className="team-spotlight team-home">
                            <div className="team-shirt-shell left">
                                <div className="team-copy">
                                    <span className="team-label">Home</span>
                                    <span className="team-name">{matchData.home_team.short_name}</span>
                                </div>
                                <div className="team-shirt left" aria-hidden="true">
                                    <svg viewBox="0 0 64 64">
                                        <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="score-block" aria-label="Final score">
                            <span className="score-total">{matchData.home_team_score} - {matchData.away_team_score}</span>
                            <span className="score-caption">Full time</span>
                        </div>
                        <div className="team-spotlight team-away">
                            <div className="team-shirt-shell right">
                                <div className="team-shirt right" aria-hidden="true">
                                    <svg viewBox="0 0 64 64">
                                        <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                                    </svg>
                                </div>
                                <div className="team-copy">
                                    <span className="team-label">Away</span>
                                    <span className="team-name">{matchData.away_team.short_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="match-hero-sidebars" aria-label="Goal scorers">
                    {renderScorers(homeScorers, 'home', matchData.home_team.short_name)}
                    {renderScorers(awayScorers, 'away', matchData.away_team.short_name)}
                </div>
            </div>
        </div>
        )
}


export default MatchDetailsDisplay;