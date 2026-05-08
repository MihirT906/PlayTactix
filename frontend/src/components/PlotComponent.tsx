import React, { useState, useMemo, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import AnnotationStore from '../services/AnnotationStore-optimized'
import type { FrameData } from '../types/FrameDataInterfaces'
import { APP_CONFIG, SELECTED_POINTS_OPACITY, UNSELECTED_POINTS_OPACITY } from '../config'
// Import the background image
import backgroundImage from '../../../data/background_image.png';
import type { MatchData } from '../types/MatchDataInterfaces'
import { useStyleConfig } from '../context/StyleConfigContext'

// const annotationStore = new AnnotationStore()

interface PlotComponentProps {
  currentFrame: number
  frameData: FrameData | null
  matchData: MatchData | null
  annotationStore: AnnotationStore
  onAnnotationUpdate?: () => void // Optional callback to trigger when annotations are updated
}

const PlotComponent: React.FC<PlotComponentProps> = ({ currentFrame, matchData, frameData, annotationStore, onAnnotationUpdate }) => {
  const plotConfig = APP_CONFIG.plot
  const { homeTeamColor, awayTeamColor, eventStyles } = useStyleConfig()
  const [focusPoints, setFocusPoints] = useState<number[]>([]) // Points that are highlighted on click
  const [firstPoint, setFirstPoint] = useState<number | null>(null) // First point selected when drawing a line between two players
  const [focusEnabled, setFocusEnabled] = useState(false) // 'Player Focus' mode toggled to draw lines
  const [lines, setLines] = useState<any[]>([]) // User annotation lines
  const [shapes, setShapes] = useState<any[]>([]) // User annotation shapes
  const [dragMode, setDragMode] = useState<string>('select')
  const image_src = backgroundImage; // Set the background image source

  // Utility function to filter arrays based on a boolean mask
  const filterByMask = <T,>(arr: T[], mask: boolean[]) =>
    arr.filter((_, idx) => mask[idx]);

  // Button configuration for 'Player Focus' mode
  const player_focus_button = useMemo(() => ({ // Button to toggle 'Player Focus' mode
    name: 'Player Focus',
    icon: Plotly.Icons.tooltip_basic,
    click: () => {
        // console.log('event', frameData?.events)
        setFocusEnabled(prev => !prev)
      },
  }), [])
  
  // Trace for off-ball runs
  const offBallRunTrace = useMemo(() => {
    const events = frameData?.events?.filter(
      e => e.event_type === 'off_ball_run'
    ) || [];

    console.log('Computing off-ball run trace for frame:', currentFrame, 'with events:', events.length)
    const x: (number | null)[] = [];
    const y: (number | null)[] = [];

    for (const e of events) {
      x.push(e.attacking_side == 'left_to_right' ? e.x_start : -e.x_start, e.attacking_side == 'left_to_right' ? e.x_end : -e.x_end, null);
      y.push(e.attacking_side == 'left_to_right' ? e.y_start : -e.y_start, e.attacking_side == 'left_to_right' ? e.y_end : -e.y_end, null);
    }

    return {
      x,
      y,
      mode: 'lines',
      type: 'scatter',
      line: {
        color: eventStyles.offBallRun.color,
        width: eventStyles.offBallRun.width,
        dash: 'dashdot',
      },
    };
  }, [eventStyles.offBallRun.color, eventStyles.offBallRun.width, frameData]);

  // Player masks to determine which players are in possession, passing options, or on-ball engagement based on the events in the current frame
  const playerMasks = useMemo(() => {
    if (!frameData) return null;

    const playerIds = frameData.players.player_id || [];

    const possessionPlayerId =
      frameData.events?.find(e => e.event_type === 'player_possession')?.player_id;

    const passingOptionsSet = new Set(
      frameData.events?.filter(e => e.event_type === 'passing_option')
        .map(e => e.player_id) || []
    );

    const engagementSet = new Set(
      frameData.events?.filter(e => e.event_type === 'on_ball_engagement')
        .map(e => e.player_id) || []
    );

    return {
      possession: playerIds.map(id => id === possessionPlayerId),
      passing_options: playerIds.map(id => passingOptionsSet.has(id)),
      on_ball_engagement: playerIds.map(id => engagementSet.has(id)),
      regular: playerIds.map(
        id =>
          id !== possessionPlayerId &&
          !passingOptionsSet.has(id) &&
          !engagementSet.has(id)
      ),
    };
  }, [frameData]);

  // Creating traces of diff styling for players based on their involvement in the current frame's events (possession, passing options, on-ball engagement)
  const playerTraces = useMemo(() => {
    if (!frameData) return [];

    const players = frameData.players;

    const build = (mask: boolean[], lineColor: string, lineWidth = 1, sizeMultiplier = 1) => ({
      x: filterByMask(players.x, mask),
      y: filterByMask(players.y, mask),
      mode: 'markers+text',
      type: 'scatter',
      marker: {
        size: plotConfig.markerSize * sizeMultiplier,
        color: filterByMask(players.team_id, mask).map((id) => {
          if (id === matchData?.home_team.id) {
            return homeTeamColor;
          } else if (id === matchData?.away_team.id) {
            return awayTeamColor;
          } else {
            return plotConfig.markerColor; // Default color if team ID doesn't match
          }
        }),
        line: {
          color: lineColor,
          width: lineWidth,
        },
        opacity: SELECTED_POINTS_OPACITY,
      },
      selectedpoints: firstPoint !== null || focusPoints.length > 0 ? [firstPoint, ...focusPoints] : undefined, // Highlight points that are either the first point selected or have focus lines connected to them
      selected: {
        marker: { opacity: SELECTED_POINTS_OPACITY },
      },
      unselected: {
        marker: { opacity: firstPoint !== null || focusPoints.length > 0 ? UNSELECTED_POINTS_OPACITY : SELECTED_POINTS_OPACITY },
      },
    });

    const EMPTY_MASK = frameData?.players?.x?.map(() => true) || [];
    return [
      build(playerMasks?.regular || EMPTY_MASK, '#000000'),
      build(playerMasks?.possession || EMPTY_MASK, eventStyles.playerPossession.color, eventStyles.playerPossession.width),
      build(playerMasks?.passing_options || EMPTY_MASK, eventStyles.passingOption.color, eventStyles.passingOption.width),
      build(playerMasks?.on_ball_engagement || EMPTY_MASK, eventStyles.onBallEngagement.color, eventStyles.onBallEngagement.width),
    ];
  }, [awayTeamColor, eventStyles.onBallEngagement.color, eventStyles.onBallEngagement.width, eventStyles.passingOption.color, eventStyles.passingOption.width, eventStyles.playerPossession.color, eventStyles.playerPossession.width, frameData, homeTeamColor, matchData])

  // Creates lines to add to Plotly.layout using the player focus lines stored in annotationStore
  const updateLines = () => { 
    setLines([])
    setFocusPoints([])
    for (const [firstPoint, secondPoint] of annotationStore.getPlayerFocusLines(currentFrame) as [number, number][]) {
      setFocusPoints(prev => [...prev, firstPoint, secondPoint]) // Add all players that have lines connected to them to focusPoints
      const newLine = {
        type: 'line',
        x0: frameData?.players.x[firstPoint], 
        y0: frameData?.players.y[firstPoint],
        x1: frameData?.players.x[secondPoint],
        y1: frameData?.players.y[secondPoint],
        line: {
          color: plotConfig.focusLineColor,
          width: plotConfig.focusLineWidth,
        },
        editable: true,
        name: `Player1:${firstPoint},Player2:${secondPoint}`, // Using this name to identify the players connected by the line
      }
      setLines((prev) => [...prev, newLine]) // Add a new line based on updated player positions
    }
  }

  const updateShapes = () => {
    const drawShapes = annotationStore.getDrawAnnotations(currentFrame)
    setShapes(Array.from(drawShapes)) // Update shapes based on the draw annotations in the store
  }

  // Lines have to be recreated every frame as player positions move
  useEffect(() => { 
    updateLines()
    updateShapes()
    setDragMode('select')
    annotationStore.update_active_annotation(currentFrame) // Update active annotations in the store based on the current frame
  }, [frameData]) 

  // Allows the user to 'Focus' on a player or draw lines between them
  const handleClick = (event: any) => { 
    if (!focusEnabled) return
    if (!event?.points?.length) return
    const pointIndex = event.points[0].pointIndex
    console.log('Clicked point index:', pointIndex)
    if (firstPoint === null) {
      console.log('Setting first point to index:', event.points[0])
      setFirstPoint(pointIndex)
    }
    else {
      // Add a line from firstPoint to pointIndex
      if (firstPoint === pointIndex) {
        console.log('Clicked the same point again, resetting first point.')
        setFirstPoint(null)
        return
      }
      annotationStore.addPlayerFocusAnnotation(firstPoint, pointIndex, currentFrame)
      updateLines()
      onAnnotationUpdate?.()
      setFirstPoint(null) // Reset first point for the next line
    }
    return []
  }

  // Handles deletion of lines
  const handleRelayout = (eventData: any) => {
    console.log('Relayout event data:', eventData)
    if ('dragmode' in eventData) {
      setDragMode(eventData['dragmode'])
    }
    else if ('shapes' in eventData) {
      annotationStore.handleAnnotationRelayout(eventData, currentFrame)
      updateLines()
      updateShapes()
      onAnnotationUpdate?.() 
    }
    //annotationStore.describeAnnotationStore() // For debugging - logs the current state of the annotation store after every relayout event
  }

  return (
    <div className="plot-container">
      <Plot className='PlotComponent'
        data={[
          ...playerTraces,
          offBallRunTrace,
          {
            x: [frameData?.ball.ball_x],
            y: [frameData?.ball.ball_y],
            mode: 'markers+text',
            type: 'scatter',
            marker: {
              size: plotConfig.ballMarkerSize,
              color: plotConfig.ballMarkerColor,
              line: {
                color: '#000000',
                width: 1,
              },
            },
          } as any,
        ]}
        layout={{
          // title: { text: plotConfig.title },
          xaxis: { range: [-56.5, 56.5], showgrid: false, visible: false },
          yaxis: { range: [-38, 38], showgrid: false, visible: false },
          width: 700,
          height: 500,
          margin: { l: 20, r: 20, t: 20, b: 20 },
          paper_bgcolor: '#4cbb17',
          plot_bgcolor: '#4cbb17',
          showlegend: false,
          dragmode: dragMode as any,
          shapes: [...lines, ...shapes], // Contains player focus lines
          images: [
            {
              source: image_src,
              xref: 'x',
              yref: 'y',
              x: -56.5,
              y: 38,
              sizex: 113,
              sizey: 76,
              layer: 'below',
              opacity: 0.8,
              sizing: 'stretch',
            }
          ]
        }}

        config={{
          editable: false,
          displayModeBar: true,
          modeBarButtonsToAdd: [player_focus_button, ...plotConfig.modeBarButtonsToAdd as any],
          modeBarButtonsToRemove: [...plotConfig.modeBarButtonsToRemove as any],
        }}
        onClick={handleClick}
        onRelayout={handleRelayout}
      />
    </div>
  )
}

export default PlotComponent