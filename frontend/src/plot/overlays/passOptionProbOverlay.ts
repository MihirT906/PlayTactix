import type { Data } from 'plotly.js'
import type { Event, FrameData } from '../../types/FrameDataInterfaces'
import { APP_CONFIG } from '../../config'

const PASS_COMPLETION_THRESHOLD = 0.65

const getInvertedHexColor = (color: string) => {
    const normalizedColor = color.trim()
    const hex = normalizedColor.startsWith('#') ? normalizedColor.slice(1) : normalizedColor

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return color
    }

    const invertedHex = (0xffffff ^ Number.parseInt(hex, 16))
        .toString(16)
        .padStart(6, '0')

    return `#${invertedHex}`
}

const getOverlayOpacity = (xPassCompletion: number) => {
    const isGoodPass = xPassCompletion >= PASS_COMPLETION_THRESHOLD
    const normalized = isGoodPass
        ? (xPassCompletion - PASS_COMPLETION_THRESHOLD) / (1 - PASS_COMPLETION_THRESHOLD)
        : (PASS_COMPLETION_THRESHOLD - xPassCompletion) / (1 - PASS_COMPLETION_THRESHOLD)

    return normalized
    return 0.15 + 0.85 * Math.pow(Math.max(0, Math.min(normalized, 1)), 0.4)
}

// A label at the middle of a passing option's line, showing its completion chance as a percentage.
// Drawn as a Plotly layout annotation: a line trace only shows hover at its end points, which sit
// under the player markers, so a tooltip alone never shows.
export type PassOptionProbLabel = {
    x: number
    y: number
    text: string
    showarrow: false
    xref: 'x'
    yref: 'y'
    font: { family: string; size: number; color: string }
    bgcolor: string
    bordercolor: string
    borderwidth: number
    borderpad: number
}

export function buildPassOptionProbOverlay(
  frameData: FrameData | null,
  frameEvents: Event[],
  passingOptionColor: string
): { traces: Data[]; labels: PassOptionProbLabel[] } | null {
    if (!frameData) {
        return null;
    }

    const plotConfig = APP_CONFIG.plot

    const players = frameData.players;
    const playerIndexById = new Map(
      players.player_id.map((playerId, index) => [playerId, index])
    );

    const traces: Data[] = [];
    const labels: PassOptionProbLabel[] = [];

    for (const event of frameEvents) {
        if (event.event_type !== 'passing_option') continue;

        const sourcePlayerId = event.player_in_possession_id;
        const targetPlayerId = event.player_id;

        if (!sourcePlayerId || !targetPlayerId) continue;

        const sourceIndex = playerIndexById.get(sourcePlayerId);
        const targetIndex = playerIndexById.get(targetPlayerId);

        if (sourceIndex == null || targetIndex == null) continue;

        const xPassCompletion = event.xpass_completion;
        if (xPassCompletion == null || xPassCompletion === -1) continue;

        const isGoodPass = xPassCompletion >= PASS_COMPLETION_THRESHOLD
        const opacity = getOverlayOpacity(xPassCompletion)
        const lineColor = isGoodPass
            ? passingOptionColor
            : getInvertedHexColor(passingOptionColor)
        const percent = `${Math.round(xPassCompletion * 100)}%`
        const x = [players.x[sourceIndex], players.x[targetIndex]]
        const y = [players.y[sourceIndex], players.y[targetIndex]]

        traces.push({
            x,
            y,
            type: 'scatter',
            mode: 'lines',
            hovertemplate: `xPass Completion: ${percent}<extra></extra>`,
            opacity,
            line: {
                color: lineColor,
                width: plotConfig.markerSize,
            },
        });

        labels.push({
            x: (x[0] + x[1]) / 2,
            y: (y[0] + y[1]) / 2,
            text: percent,
            showarrow: false,
            xref: 'x',
            yref: 'y',
            font: { family: 'Inter, sans-serif', size: 11, color: '#f8fafc' },
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            bordercolor: lineColor,
            borderwidth: 1,
            borderpad: 2,
        });
    }

    return { traces, labels };
}
