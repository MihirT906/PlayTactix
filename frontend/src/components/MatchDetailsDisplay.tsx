import type { MatchData } from '../types/MatchDataInterfaces';
import './MatchDetailsDisplay.css'
import { useEffect, useState } from 'react';
import { APP_CONFIG, CHUNK_SIZE, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from '../config'

const MatchDetailsDisplay = ({ matchData }: { matchData: MatchData }) => {

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
                "--home-color": matchData?.home_team_kit?.jersey_color ?? "#3b82f6",
                "--away-color": matchData?.away_team_kit?.jersey_color ?? "#ef4444",

                boxShadow: `
                            inset 0 0 0 0 transparent,
                            0 4px 12px rgba(0,0,0,0.08)
                            `
            } as React.CSSProperties}>
            <div className="team-row">
                <div className="team">
                    <ul className="players-list">
                    {matchData?.players
                        .filter(player => player.team_id === matchData.home_team.id && player.goal > 0)
                        .map(player => (
                        <li key={player.id} className="player-item">
                            {player.first_name} {player.last_name} - {player.goal} goal(s)
                        </li>
                        ))}
                    </ul>
                </div>
                <div className="team">
                    <div className="team-shirt left">
                        <svg viewBox="0 0 64 64">
                            <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                        </svg>
                    </div>
                    <span>{matchData?.home_team?.short_name}</span>
                </div>
                <div className="details"> 
                    <span className="venue">
                        {matchData?.competition_edition?.name}
                    </span>
                    <span className="vs">{matchData?.home_team_score} - {matchData?.away_team_score}</span>
                    <span className="venue">{matchData?.stadium?.name}, {matchData?.stadium?.city}</span>
                </div>
                <div className="team">
                    <div className="team-shirt right">
                        <svg viewBox="0 0 64 64">
                            <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
                        </svg>
                    </div>
                    <span>{matchData?.away_team?.short_name}</span>
                </div>
                <div className="team">
                    <ul className="players-list">
                    {matchData?.players
                        .filter(player => player.team_id === matchData.away_team.id && player.goal > 0)
                        .map(player => (
                        <li key={player.id} className="player-item">
                            {player.first_name} {player.last_name} - {player.goal} goal(s)
                        </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
        )
}


export default MatchDetailsDisplay;