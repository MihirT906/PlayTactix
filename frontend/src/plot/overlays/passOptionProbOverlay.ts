import type { FrameData } from '../../types/FrameDataInterfaces'
import { useStyleConfig } from '../../context/StyleConfigContext'
import { APP_CONFIG } from '../../config'

const PASS_COMPLETION_THRESHOLD = 0.65
const PASS_OPTION_PROB_INVERSE_COLOR = '#0f172a'

const getOverlayOpacity = (xPassCompletion: number) => {
    const isGoodPass = xPassCompletion >= PASS_COMPLETION_THRESHOLD
    const normalized = isGoodPass
        ? (xPassCompletion - PASS_COMPLETION_THRESHOLD) / (1 - PASS_COMPLETION_THRESHOLD)
        : xPassCompletion / PASS_COMPLETION_THRESHOLD

    return 0.15 + 0.85 * Math.pow(Math.max(0, Math.min(normalized, 1)), 0.4)
}

export function buildPassOptionProbOverlay(frameData: FrameData | null) {
    if (!frameData) {
        return null;
    }

    const plotConfig = APP_CONFIG.plot
    const { eventStyles } = useStyleConfig()

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

        const xPassCompletion = event.xpass_completion;
        if (xPassCompletion === -1) return [];

        const isGoodPass = xPassCompletion >= PASS_COMPLETION_THRESHOLD
        const opacity = getOverlayOpacity(xPassCompletion)
        const lineColor = isGoodPass ? eventStyles.passingOption.color : PASS_OPTION_PROB_INVERSE_COLOR

        return [{
            x: [players.x[sourceIndex], players.x[targetIndex]],
            y: [players.y[sourceIndex], players.y[targetIndex]],
            type: 'scatter',
            mode: 'lines',
            hovertemplate:`xPass Completion: ${xPassCompletion.toFixed(2)}<extra></extra>`,
            hoverlabel: 'xPass Completion',
            opacity,
            line: {
                color: lineColor,
                width: plotConfig.markerSize,
            },
        }];
    });
    
    return traces;
}