import { useEffect, useState } from 'react';
import './MatchPicker.css';
import { APP_CONFIG } from '../config';
import MatchDataManager from '../services/MatchDataManager';
import TeamShirt from './TeamShirt.tsx';
import type { MatchData } from '../types/MatchDataInterfaces';

type MatchPickerProps = {
    onMatchSelected: (matchId: number) => void;
};

const MatchPicker = ({ onMatchSelected }: MatchPickerProps) => {
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [loading, setLoading] = useState<boolean>(false); // Added loading state

    const matchDataManager = new MatchDataManager();


    useEffect(() => {
        console.log('Loading state:', loading); // Debugging loading state
    }, [loading]);

    useEffect(() => {
        const fetchMatchData = async () => {
            try {
                const folderResponse = await fetch('https://api.github.com/repos/SkillCorner/opendata/contents/data/matches');
                if (!folderResponse.ok) {
                    throw new Error('Failed to fetch folder data');
                }
                const folders = await folderResponse.json();
                const folderNames = folders
                    .filter((item: any) => item.type === 'dir')
                    .map((item: any) => item.name);

                const matchData = await Promise.all(
                    folderNames.map(async (folderName: string) => {
                        const matchResponse = await fetch(
                            `https://raw.githubusercontent.com/SkillCorner/opendata/master/data/matches/${folderName}/${folderName}_match.json`
                        );
                        if (!matchResponse.ok) {
                            console.warn(`Failed to fetch match data for folder: ${folderName}`);
                            return null;
                        }
                        const match = await matchResponse.json();
                        
                        return match
                    })
                );
                setMatches(matchData.filter(Boolean));
            } catch (error) {
                console.error('Error fetching match data:', error);
            }
        };

        fetchMatchData();
    }, []);

    const handleMatchClick = async (matchId: number) => {
        console.log(`Match ${matchId} clicked`);
        setLoading(true);
        try {
            await matchDataManager.downloadMatchData(matchId);
            onMatchSelected(matchId);
        } catch (error) {
            console.error(`Error downloading match data for match ${matchId}:`, error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-screen home-screen--embedded">
            <h1 className="home-title">SkillCorner OpenData Matches:</h1>
            {loading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                </div>
            )}
            <div className="match-list">
                {matches.map((match) => (
                    <button
                        key={match.id}
                        className="match-card"
                        onClick={() => handleMatchClick(match.id)}
                        disabled={loading} // Disable buttons when loading
                        style={{
                            "--home-color": match.home_team_kit?.jersey_color ?? APP_CONFIG.theme.defaultTeamColors.home,
                            "--away-color": match.away_team_kit?.jersey_color ?? APP_CONFIG.theme.defaultTeamColors.away
                        } as React.CSSProperties}
                    >
                        <div className="match-header">
                            <div className="team-row">
                                <div className="team">
                                    <TeamShirt side="left" />
                                    <span>{match.home_team.short_name}</span>
                                </div>
                                <div className="details"> 
                                    <span className="competition">{match.competition_edition.name}</span>
                                    <span className="vs">{match.home_team_score} - {match.away_team_score}</span>
                                </div>
                                
                                <div className="team">
                                    <TeamShirt side="right" />
                                    <span>{match.away_team.short_name}</span>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MatchPicker;