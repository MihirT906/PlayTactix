import type { MatchData } from '../types/MatchDataInterfaces';
import './MatchDetailsDisplay.css'
import type { CSSProperties } from 'react';
import TeamShirt from './TeamShirt.tsx';
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

    const renderScorers = (scorers: typeof homeScorers, accentClass: string) => (
        <div className={`scorers-panel ${accentClass}`}>
            <p className="scorers-label">Scorers</p>
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

    return (
        <div className="match-info"
            style={{
                "--home-color": homeTeamColor,
                "--away-color": awayTeamColor,
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
                        {renderScorers(homeScorers, 'home')}
                        <div className="team-spotlight team-home">
                            <div className="team-shirt-shell left">
                                <div className="team-copy">
                                    <span className="team-label">Home</span>
                                    <span className="team-name">{matchData.home_team.short_name}</span>
                                </div>
                                <TeamShirt side="left" />
                            </div>
                        </div>
                        <div className="score-block" aria-label="Final score">
                            <span className="score-total">{matchData.home_team_score} - {matchData.away_team_score}</span>
                            <span className="score-caption">Full time</span>
                        </div>
                        <div className="team-spotlight team-away">
                            <div className="team-shirt-shell right">
                                <TeamShirt side="right" />
                                <div className="team-copy">
                                    <span className="team-label">Away</span>
                                    <span className="team-name">{matchData.away_team.short_name}</span>
                                </div>
                            </div>
                        </div>
                        {renderScorers(awayScorers, 'away')}
                    </div>
                </div>
            </div>
        </div>
        )
}


export default MatchDetailsDisplay;