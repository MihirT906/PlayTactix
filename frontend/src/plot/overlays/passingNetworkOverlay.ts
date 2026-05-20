import type { FrameData } from '../../types/FrameDataInterfaces'
import { useStyleConfig } from '../../context/StyleConfigContext'
import { APP_CONFIG } from '../../config'


export function buildPassingNetworkOverlay(frameData: FrameData | null) {
    if (!frameData) {
        return null;
    }
    const plotConfig = APP_CONFIG.plot
    const { homeTeamColor, awayTeamColor, eventStyles, teamVisibility, eventVisibility, overlayVisibility } = useStyleConfig()

    const players = frameData.players;
    const playerIndexById = new Map(
      players.player_id.map((playerId, index) => [playerId, index])
    );

    const traces = frameData.events.flatMap((event) => {
        if (event.event_type !== 'passing_option') return [];

        const sourcePlayerId = event.player_in_possession_id;
        const targetPlayerId = event.player_id;

        if (!sourcePlayerId || !targetPlayerId) return [];

        const sourceIndex = playerIndexById.get(sourcePlayerId);
        const targetIndex = playerIndexById.get(targetPlayerId);

        if (sourceIndex == null || targetIndex == null) return [];

        const rawOpacity = event.xthreat;
        if (rawOpacity === -1) return [];
        const normalized = Math.min(rawOpacity / 0.1, 1);
        const opacity = 0.15 + 0.85 * Math.pow(normalized, 0.4);

        return [{
            x: [players.x[sourceIndex], players.x[targetIndex]],
            y: [players.y[sourceIndex], players.y[targetIndex]],
            type: 'scatter',
            mode: 'lines',
            hoverinfo: 'text',
            text: `xPass: ${rawOpacity.toFixed(2)}`,
            opacity,
            line: {
            color: eventStyles.passingOption.color,
            width: plotConfig.markerSize,
            },
        }];
    });
    
    return traces;

}