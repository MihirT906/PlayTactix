import React, { useEffect, useState } from 'react';
import './HomeScreen.css';
import MatchDataManager from '../services/MatchDataManager';
import { useNavigate } from 'react-router-dom';
import type { MatchData } from '../types/DataInterfaces';

const HomeScreen = () => {
    // const [matches, setMatches] = useState<{
    //     id: string;
    //     date_time: string;
    //     stadium: { name: string; city: string };
    //     home_team: { short_name: string };
    //     away_team: { short_name: string };
    //     home_team_score: number;
    //     away_team_score: number;
    // }[]>([]);
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [loading, setLoading] = useState<boolean>(false); // Added loading state
    const navigate = useNavigate(); // Added useNavigate hook

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
                        // return {
                        //     id: match.id,
                        //     date_time: match.date_time,
                        //     stadium: match.stadium,
                        //     home_team: match.home_team,
                        //     away_team: match.away_team,
                        //     home_team_score: match.home_team_score,
                        //     away_team_score: match.away_team_score,
                        // };
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
            
        } catch (error) {
            console.error(`Error downloading match data for match ${matchId}:`, error);
        } finally {
            navigate('/app'); // Navigate to /app after download
            setLoading(false);
        }
    };

    return (
        <div className={`home-screen ${loading ? 'loading' : ''}`}>
            <h1 className="home-title">Choose a game ...</h1>
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
                            background: `linear-gradient(
                                to right,
                                ${match.home_team_kit?.jersey_color ?? "#3b82f6"},
                                ${match.away_team_kit?.jersey_color ?? "#ef4444"}
                            )`,
                            backgroundSize: "100% 5px",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "top"
                        }}
                    >
                        <h2>{match.home_team.short_name} vs {match.away_team.short_name}</h2>
                        <p>{new Date(match.date_time).toLocaleString()}</p>
                        <p>{match.stadium.name}, {match.stadium.city}</p>
                        <p>Score: {match.home_team_score} - {match.away_team_score}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default HomeScreen;