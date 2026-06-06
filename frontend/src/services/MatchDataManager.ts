import { getLogger } from "./logger";

const logger = getLogger("MatchDataManager");

export default class MatchDataManager {

    async downloadMatchData(matchId: number): Promise<void> {
        logger.info("Downloading match data for match_id=%s", matchId)
        try {
            const response = await fetch(`http://localhost:8000/data/match/${matchId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch match data for match ${matchId}`);
            }

            logger.info("Match data downloaded successfully for match_id=%s", matchId)
        } catch (error) {
            logger.error("Failed to download match data for match_id=%s", matchId, error)
        }
    }
}