export default class MatchDataManager {

    constructor() {
        console.log('Match DataManager initialized');
    }

    async downloadMatchData(matchId: number): Promise<void> {
        console.log(`Downloading data for match: ${matchId}`);
        try {
            const response = await fetch(`http://localhost:8000/data/match/${matchId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch match data for match ${matchId}`);
            }

            console.log(`Match data for ${matchId} successfully saved on the server.`);
        } catch (error) {
            console.error('Error downloading match data:', error);
        }
    }
}