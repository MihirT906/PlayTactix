import React, { useEffect, useState } from 'react';

const HomeScreen = () => {
    const [matches, setMatches] = useState<{
        id: string;
        date_time: string;
        stadium: { name: string; city: string };
        home_team: { short_name: string };
        away_team: { short_name: string };
        home_team_score: number;
        away_team_score: number;
    }[]>([]);

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
                        console.log(`Fetched match data for folder: ${folderName}`, match);
                        return {
                            id: match.id,
                            date_time: match.date_time,
                            stadium: match.stadium,
                            home_team: match.home_team,
                            away_team: match.away_team,
                            home_team_score: match.home_team_score,
                            away_team_score: match.away_team_score,
                        };
                    })
                );

                setMatches(matchData.filter((match) => match !== null));
            } catch (error) {
                console.error('Error fetching match data:', error);
            }
        };

        fetchMatchData();
    }, []);

    const handleButtonClick = (matchId: string) => {
        console.log(`Button clicked for match ID: ${matchId}`);
    };

    return (
        <div style={{ 
            color: 'black', 
            textAlign: 'center', 
            marginTop: '20px', 
            border: '2px solid red', 
            fontSize: '24px', 
            padding: '20px'
        }}> 
            <h1>HOME SCREEN</h1>
            <h2>Match List</h2>
            {matches.length > 0 ? (
                <div>
                    {matches.map((match, index) => (
                        <button 
                            key={index} 
                            onClick={() => handleButtonClick(match.id)} 
                            style={{ 
                                margin: '10px auto', 
                                padding: '10px 20px', 
                                fontSize: '16px', 
                                cursor: 'pointer', 
                                border: '1px solid black', 
                                borderRadius: '5px', 
                                backgroundColor: '#f0f0f0',
                                display: 'block',
                                width: '300px'
                            }}
                        >
                            {`ID: ${match.id}, Date: ${match.date_time}, Stadium: ${match.stadium.name}, ${match.stadium.city}, Home: ${match.home_team.short_name}, Away: ${match.away_team.short_name}, Score: ${match.home_team_score}-${match.away_team_score}`}
                        </button>
                    ))}
                </div>
            ) : (
                <p>Loading matches...</p>
            )}
        </div>
    );
};

export default HomeScreen;