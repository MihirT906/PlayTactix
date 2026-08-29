import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import AnnotationStore from '../services/AnnotationStore-optimized'
import type { FrameData } from '../types/FrameDataInterfaces'
import { APP_CONFIG, SELECTED_POINTS_OPACITY } from '../config'
// Import the background image
import backgroundImage from '../../../data/background_image.png';
import type { MatchData } from '../types/MatchDataInterfaces'
import { useStyleConfig } from '../context/StyleConfigContext'
import { useMatchSession, type EditMode } from '../context/MatchSessionContext'
import { buildPassOptionProbOverlay } from '../plot/overlays/passOptionProbOverlay'
import { buildPitchControlOverlay } from '../plot/overlays/pitchControlOverlay.ts'
import { buildEventVisualisationOverlay } from '../plot/overlays/eventVisualisationOverlay'

import { getLogger } from "../services/logger";

const logger = getLogger("PlotComponent");


const annotationStore = new AnnotationStore()

interface PlotComponentProps {
  currentFrame: number
  clipFrame: number
  frameData: FrameData | null
  matchData: MatchData | null
  annotationStore: AnnotationStore
  onAnnotationUpdate?: () => void // Optional callback to trigger when annotations are updated
}

const PlotComponent: React.FC<PlotComponentProps> = ({ currentFrame, clipFrame, matchData, frameData, annotationStore, onAnnotationUpdate }) => {
  const plotConfig = APP_CONFIG.plot
  const { homeTeamColor, awayTeamColor, eventStyles, teamVisibility, eventVisibility } = useStyleConfig()
  const { session, resources, setEditMode } = useMatchSession()
  const overlayManager = resources.overlayManager
  const overlay = session.overlays.active
  const [focusPoints, setFocusPoints] = useState<number[]>([]) // Points that are highlighted on click
  const [firstPoint, setFirstPoint] = useState<number | null>(null) // First point selected when drawing a line between two players
  // const [focusEnabled, setFocusEnabled] = useState(false) // 'Player Focus' mode toggled to draw lines
  const [lines, setLines] = useState<any[]>([]) // User annotation lines
  const [shapes, setShapes] = useState<any[]>([]) // User annotation shapes
  const [dragMode, setDragMode] = useState<string>('select')
  const [overlayTraces, setOverlayTraces] = useState<any[]>([]);
  // Temporary, visualisation-only position edits keyed by player id. These are
  // layered on top of frameData while playback is paused and are wiped whenever
  // a new frame arrives (see the [frameData] effect below), so resuming playback
  // restores the real tracked positions.
  const [positionOverrides, setPositionOverrides] = useState<Map<number, { x: number; y: number }>>(new Map())
  const isPlaying = session.playback.isPlaying
  const graphDivRef = useRef<any>(null)
  const dragStateRef = useRef<{ playerId: number } | null>(null)
  // Latest values the imperative pointer handlers need, kept in a ref so the
  // handlers can stay referentially stable (bound once to the graph div).
  const dragDepsRef = useRef({ frameData, isPlaying, positionOverrides, editMode: session.ui.editMode })
  dragDepsRef.current = { frameData, isPlaying, positionOverrides, editMode: session.ui.editMode }
  const image_src = backgroundImage; // Set the background image source
  const pitchOverlay = session.playback.clip.overlaySegments.find((overlay) => overlay.type === 'pitch')
  const isPitchBackgroundActive =
    pitchOverlay !== undefined &&
    clipFrame >= pitchOverlay.clipStart &&
    clipFrame <= pitchOverlay.clipEnd
  const pitchControlOverlaySegment = session.playback.clip.overlaySegments.find((overlay) => overlay.type === 'pitch_control')
  const isPitchControlActive =
    pitchControlOverlaySegment !== undefined &&
    clipFrame >= pitchControlOverlaySegment.clipStart &&
    clipFrame <= pitchControlOverlaySegment.clipEnd
  const passOptionProbOverlaySegment = session.playback.clip.overlaySegments.find((overlay) => overlay.type === 'pass_option_prob')
  const isPassOptionProbActive =
    passOptionProbOverlaySegment !== undefined &&
    clipFrame >= passOptionProbOverlaySegment.clipStart &&
    clipFrame <= passOptionProbOverlaySegment.clipEnd
  const editMode = session.ui.editMode;

  // Utility function to filter arrays based on a boolean mask
  const filterByMask = <T,>(arr: T[], mask: boolean[]) =>
    arr.filter((_, idx) => mask[idx]);

  const getVisibleTeamMask = (teams: string[]) =>
    teams.map((team) => {
      if (team === 'home') {
        return teamVisibility.home;
      }

      if (team === 'away') {
        return teamVisibility.away;
      }

      return true;
    });

  // Button configuration for 'Player Focus' mode
  const player_focus_button = useMemo(() => ({ // Button to toggle 'Player Focus' mode
    name: 'Player Focus',
    icon: Plotly.Icons.tooltip_basic,
    click: () => {
        setEditMode('draw_line_players')
        logger.info("Player Focus mode activated")
      },
  }), [setEditMode])
  
  // Trace for off-ball runs
  const offBallRunTrace = useMemo(() => {
    if (!eventVisibility.offBallRun) {
      return null;
    }

    if (frameData?.events.length === 0) {
      return null; // No events to process, return null to avoid rendering an empty trace
    }

    const events = frameData?.events?.filter(
      e => e.event_type === 'off_ball_run'
    ) || [];
    
    const x: (number | null)[] = [];
    const y: (number | null)[] = [];

    for (const e of events) {
      x.push(e.x_start, e.x_end, null);
      y.push(e.y_start, e.y_end, null);
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
  }, [eventStyles.offBallRun.color, eventStyles.offBallRun.width, eventVisibility.offBallRun, frameData]);

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

    const possessionMask = playerIds.map(id => id === possessionPlayerId);
    const passingOptionsMask = playerIds.map(id => passingOptionsSet.has(id));
    const engagementMask = playerIds.map(id => engagementSet.has(id));

    const visiblePossessionMask = eventVisibility.playerPossession
      ? possessionMask
      : playerIds.map(() => false);
    const visiblePassingOptionsMask = eventVisibility.passingOption
      ? passingOptionsMask
      : playerIds.map(() => false);
    const visibleEngagementMask = eventVisibility.onBallEngagement
      ? engagementMask
      : playerIds.map(() => false);

    return {
      possession: visiblePossessionMask,
      passing_options: visiblePassingOptionsMask,
      on_ball_engagement: visibleEngagementMask,
      regular: playerIds.map(
        (_, index) =>
          !visiblePossessionMask[index] &&
          !visiblePassingOptionsMask[index] &&
          !visibleEngagementMask[index]
      ),
    };
  }, [eventVisibility.onBallEngagement, eventVisibility.passingOption, eventVisibility.playerPossession, frameData]);

  // Lookup of player id -> display info (name, position) sourced from matchData
  const playerInfoById = useMemo(() => {
    const map = new Map<number, { name: string; position: string }>()
    for (const player of matchData?.players || []) {
      map.set(player.id, {
        name: player.short_name || '',
        position: player.player_role?.acronym || '',
      })
    }
    return map
  }, [matchData])

  // Creating traces of diff styling for players based on their involvement in the current frame's events (possession, passing options, on-ball engagement)
  const playerTraces = useMemo(() => {
    if (!frameData) return [];

    const players = frameData.players;
    if (players.player_id.length === 0)
      return []; // Return empty array if there are no players in the frame data

    // Apply any temporary drag overrides on top of the tracked positions
    const overriddenX = players.x.map((x, i) => positionOverrides.get(players.player_id[i])?.x ?? x)
    const overriddenY = players.y.map((y, i) => positionOverrides.get(players.player_id[i])?.y ?? y)

    const visibleTeamMask = getVisibleTeamMask(players.team);
    const applyVisibilityMask = (mask: boolean[]) => mask.map((isVisible, index) => isVisible && visibleTeamMask[index]);

    const build = (mask: boolean[], lineColor: string, lineWidth = 1) => {
      const visiblePlayerIds = filterByMask(players.player_id, mask)
      const visibleX = filterByMask(overriddenX, mask)
      const visibleY = filterByMask(overriddenY, mask)

      const markerTrace = {
        x: visibleX,
        y: visibleY,
        customdata: visiblePlayerIds.map((playerId) => {
          const info = playerInfoById.get(playerId)
          const name = info?.name || `Player ${playerId}`
          const label = info?.position ? `${name} (${info.position})` : name
          return [playerId, label]
        }),
        mode: 'markers+text',
        type: 'scatter',
        hovertemplate: '%{customdata[1]}<extra></extra>',
        hoverlabel: {
          font: {
            size: 16,
          },
        },
        marker: {
          size: plotConfig.markerSize,
          color: filterByMask(players.team, mask).map((team) => {
            if (team === 'home') return homeTeamColor
            if (team === 'away') return awayTeamColor
            return plotConfig.markerColor
          }),
          line: {
            color: lineColor,
            width: lineWidth,
          },
          opacity: SELECTED_POINTS_OPACITY,
        },
      }

      // Draws a halo ring (with a gap from the marker) around focused players
      const highlightedIndices = focusPoints
        .map((playerId) => visiblePlayerIds.indexOf(playerId))
        .filter((index) => index !== -1)

      const ringTrace = highlightedIndices.length > 0 ? {
        x: highlightedIndices.map((index) => visibleX[index]),
        y: highlightedIndices.map((index) => visibleY[index]),
        mode: 'markers',
        type: 'scatter',
        hoverinfo: 'skip',
        marker: {
          size: plotConfig.markerSize + plotConfig.highlightRingGap,
          symbol: 'circle',
          color: 'rgba(0,0,0,0)',
          line: {
            color: plotConfig.focusLineColor,
            width: plotConfig.highlightRingWidth,
          },
        },
        showlegend: false,
      } : null

      return ringTrace ? [markerTrace, ringTrace] : [markerTrace]
    }

    const EMPTY_MASK = frameData?.players?.x?.map(() => true) || [];
    return [
      ...build(applyVisibilityMask(playerMasks?.regular || EMPTY_MASK), '#000000'),
      ...build(applyVisibilityMask(playerMasks?.possession || EMPTY_MASK.map(() => false)), eventStyles.playerPossession.color, eventStyles.playerPossession.width),
      ...build(applyVisibilityMask(playerMasks?.passing_options || EMPTY_MASK.map(() => false)), eventStyles.passingOption.color, eventStyles.passingOption.width),
      ...build(applyVisibilityMask(playerMasks?.on_ball_engagement || EMPTY_MASK.map(() => false)), eventStyles.onBallEngagement.color, eventStyles.onBallEngagement.width),
    ];
  }, [awayTeamColor, eventStyles.onBallEngagement.color, eventStyles.onBallEngagement.width, eventStyles.passingOption.color, eventStyles.passingOption.width, eventStyles.playerPossession.color, eventStyles.playerPossession.width, eventVisibility.onBallEngagement, eventVisibility.passingOption, eventVisibility.playerPossession, frameData, homeTeamColor, matchData, playerMasks, teamVisibility.away, teamVisibility.home, focusPoints, positionOverrides])

  useEffect(() => {
    let cancelled = false;

    async function loadOverlays() {
      const traces: any[] = [];

      if (isPassOptionProbActive) {
        const result = await overlayManager.getOverlayForFrame('pass_option_prob', currentFrame, frameData);

        if (result.payload?.kind === 'pass_option_prob') {
          traces.push(...(buildPassOptionProbOverlay(result.payload.data, eventStyles.passingOption.color) || []));
        }
      }

      if (isPitchControlActive) {
        const config = {
          'homeTeamColor': homeTeamColor,
          'awayTeamColor': awayTeamColor,
        };
        const pitchControlTraces = await buildPitchControlOverlay(frameData, matchData, config);
        traces.push(...(pitchControlTraces || []));
      }

      if (overlay === 'event_visualisation') {
        const visibleEvents = session.overlays.autoDisappearEvents
          ? session.overlays.selectedEvents.filter((event) => currentFrame <= event.frame_end)
          : session.overlays.selectedEvents;
        traces.push(
          ...(buildEventVisualisationOverlay(visibleEvents, eventStyles.playerPossession.color, {
            homeTeamId: matchData?.home_team.id,
            awayTeamId: matchData?.away_team.id,
            homeTeamColor,
            awayTeamColor,
          }) || []),
        );
      }

      if (!cancelled) {
        setOverlayTraces(traces);
      }
    }

    loadOverlays();

    return () => {
      cancelled = true;
    };
  }, [overlay, isPassOptionProbActive, isPitchControlActive, frameData, currentFrame, overlayManager, eventStyles.passingOption.color, eventStyles.playerPossession.color, homeTeamColor, awayTeamColor, matchData, session.overlays.selectedEvents, session.overlays.autoDisappearEvents]);

  // Creates lines to add to Plotly.layout using the player focus lines stored in annotationStore
  const updateLines = () => { 
    setLines([])
    // setFocusPoints([])
    logger.debug("playerLineAnnotations for clipFrame:", clipFrame, annotationStore.getPlayerLineAnnotations(clipFrame))
    for (const [firstPoint, secondPoint] of annotationStore.getPlayerLineAnnotations(clipFrame) as [number, number][]) {
      // setFocusPoints(prev => [...prev, firstPoint, secondPoint]) // Add all players that have lines connected to them to focusPoints
      if (firstPoint === undefined || secondPoint === undefined) {
        console.warn('Undefined player IDs in annotationStore.getPlayerLineAnnotations:', firstPoint, secondPoint);
        continue;
      }
      const { x: x0, y: y0 } = resolvePlayerPos(firstPoint)
      const { x: x1, y: y1 } = resolvePlayerPos(secondPoint)

      const distanceLabel = (x0 !== undefined && y0 !== undefined && x1 !== undefined && y1 !== undefined)
        ? `${Math.hypot(x1 - x0, y1 - y0).toFixed(1)}m`
        : ''

      const newLine = {
        type: 'line',
        layer: 'between',
        x0,
        y0,
        x1,
        y1,
        line: {
          color: plotConfig.focusLineColor,
          width: plotConfig.focusLineWidth,
        },
        label: {
          text: distanceLabel,
          textposition: 'middle',
          font: {
            color: plotConfig.focusLineColor,
            // size: 14,
          },
        },
        editable: true,
        name: `Player1:${firstPoint},Player2:${secondPoint}`, // Using this name to identify the players connected by the line
      }
      setLines((prev) => [...prev, newLine]) // Add a new line based on updated player positions
    }
  }

  const updateShapes = () => {
    const drawShapes = annotationStore.getDrawAnnotations(clipFrame)
    setShapes(Array.from(drawShapes)) // Update shapes based on the draw annotations in the store
  }

  // Lines have to be recreated every frame as player positions move
  useEffect(() => {
    updateLines()
    updateShapes()
    setDragMode('select')
    setEditMode(null)
    // A new frame's plot represents real tracked positions, so drop any
    // temporary drag edits from the previous (paused) frame.
    setPositionOverrides((prev) => (prev.size > 0 ? new Map() : prev))
    annotationStore.update_active_annotation(clipFrame) // Update active annotations in the store based on the current clip frame
  }, [frameData])

  // Syncs Plotly's dragmode with the sidebar's 'Draw Rectangle' toggle
  useEffect(() => {
    if (editMode === 'draw_rect') {
      setDragMode('drawrect')
    } 
    else if (editMode === 'draw_line'){
      setDragMode('drawline')
    }
    // else if (dragMode === 'drawrect') {
    //   setDragMode('select')
    // }
    else {
      setDragMode('select')
    }
  }, [editMode])

  // Resolve a player's position, preferring a temporary drag override if present
  const resolvePlayerPos = (playerId: number): { x: number | undefined; y: number | undefined } => {
    const idx = frameData?.players.player_id.indexOf(playerId) ?? -1
    const override = positionOverrides.get(playerId)
    if (idx === -1) {
      return { x: override?.x, y: override?.y }
    }
    return {
      x: override?.x ?? frameData?.players.x[idx],
      y: override?.y ?? frameData?.players.y[idx],
    }
  }

  // --- Drag-to-reposition players while paused -----------------------------
  // Plotly can't drag individual scatter points, so we hit-test the player
  // markers ourselves on mousedown and translate pointer motion into data
  // coordinates using Plotly's axis objects.
  const DRAG_HIT_RADIUS_PX = plotConfig.markerSize / 2 + 6

  const endDrag = useCallback(() => {
    dragStateRef.current = null
    window.removeEventListener('mousemove', onDragMove, true)
    window.removeEventListener('mouseup', endDrag, true)
    const gd = graphDivRef.current
    if (gd) gd.style.cursor = ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onDragMove = useCallback((e: MouseEvent) => {
    const drag = dragStateRef.current
    const gd = graphDivRef.current
    if (!drag || !gd?._fullLayout) return
    const xa = gd._fullLayout.xaxis
    const ya = gd._fullLayout.yaxis
    const rect = gd.getBoundingClientRect()
    let x = xa.p2c(e.clientX - rect.left - xa._offset)
    let y = ya.p2c(e.clientY - rect.top - ya._offset)
    // Keep the player within the pitch bounds used by the layout axes
    x = Math.max(-56.5, Math.min(56.5, x))
    y = Math.max(-38, Math.min(38, y))
    setPositionOverrides((prev) => {
      const next = new Map(prev)
      next.set(drag.playerId, { x, y })
      return next
    })
  }, [])

  const onDragStart = useCallback((e: MouseEvent) => {
    const { frameData: fd, isPlaying: playing, positionOverrides: overrides, editMode: mode } = dragDepsRef.current
    // Only drag while paused and not in a click-driven edit mode (focus / lines)
    if (playing || !fd || mode !== null) return
    const gd = graphDivRef.current
    if (!gd?._fullLayout) return
    const xa = gd._fullLayout.xaxis
    const ya = gd._fullLayout.yaxis
    const rect = gd.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const ids = fd.players.player_id
    let hitIndex = -1
    let bestDist = DRAG_HIT_RADIUS_PX
    for (let i = 0; i < ids.length; i++) {
      const override = overrides.get(ids[i])
      const dataX = override?.x ?? fd.players.x[i]
      const dataY = override?.y ?? fd.players.y[i]
      const px = xa.c2p(dataX) + xa._offset
      const py = ya.c2p(dataY) + ya._offset
      const dist = Math.hypot(px - mx, py - my)
      if (dist <= bestDist) {
        bestDist = dist
        hitIndex = i
      }
    }
    if (hitIndex === -1) return // not on a player - let Plotly handle the event

    e.stopPropagation()
    e.preventDefault()
    dragStateRef.current = { playerId: ids[hitIndex] }
    gd.style.cursor = 'grabbing'
    window.addEventListener('mousemove', onDragMove, true)
    window.addEventListener('mouseup', endDrag, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAG_HIT_RADIUS_PX, onDragMove, endDrag])

  // Show a grab cursor when hovering a player while paused
  const onHoverCursor = useCallback((e: MouseEvent) => {
    const { frameData: fd, isPlaying: playing, positionOverrides: overrides, editMode: mode } = dragDepsRef.current
    const gd = graphDivRef.current
    if (!gd?._fullLayout || dragStateRef.current) return
    if (playing || !fd || mode !== null) {
      gd.style.cursor = ''
      return
    }
    const xa = gd._fullLayout.xaxis
    const ya = gd._fullLayout.yaxis
    const rect = gd.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const ids = fd.players.player_id
    let onPlayer = false
    for (let i = 0; i < ids.length; i++) {
      const override = overrides.get(ids[i])
      const px = xa.c2p(override?.x ?? fd.players.x[i]) + xa._offset
      const py = ya.c2p(override?.y ?? fd.players.y[i]) + ya._offset
      if (Math.hypot(px - mx, py - my) <= DRAG_HIT_RADIUS_PX) {
        onPlayer = true
        break
      }
    }
    gd.style.cursor = onPlayer ? 'grab' : ''
  }, [DRAG_HIT_RADIUS_PX])

  // Bind the imperative pointer handlers once we have the Plotly graph div
  const handleGraphDiv = useCallback((_figure: any, gd: any) => {
    if (!gd || graphDivRef.current === gd) return
    graphDivRef.current = gd
    gd.addEventListener('mousedown', onDragStart, true)
    gd.addEventListener('mousemove', onHoverCursor)
  }, [onDragStart, onHoverCursor])

  useEffect(() => {
    return () => {
      const gd = graphDivRef.current
      if (!gd) return
      gd.removeEventListener('mousedown', onDragStart, true)
      gd.removeEventListener('mousemove', onHoverCursor)
      window.removeEventListener('mousemove', onDragMove, true)
      window.removeEventListener('mouseup', endDrag, true)
    }
  }, [onDragStart, onHoverCursor, onDragMove, endDrag])

  // Keep player-focus lines in sync while a player is being dragged
  useEffect(() => {
    updateLines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionOverrides])

  // Allows the user to 'Focus' on a player or draw lines between them
  const handleClick = (event: any) => {
    if (editMode == 'player_focus') {
      if (!event?.points?.length) return
      console.log(event.points)
      const clickedPlayerId = event.points[0].customdata?.[0]
      if (clickedPlayerId === undefined) return
      if (focusPoints.includes(clickedPlayerId)) {
        setFocusPoints(prev => prev.filter(p => p !== clickedPlayerId))
      }else {
        setFocusPoints(prev => [...prev, clickedPlayerId])
      }
      logger.info("Player focused:", clickedPlayerId)

    }
  
    else if (editMode == 'draw_line_players') {
      if (!event?.points?.length) return
      const clickedPlayerId = event.points[0].customdata?.[0]
      if (clickedPlayerId === undefined) return
      if (firstPoint === null) {
        setFirstPoint(clickedPlayerId)
        logger.info("First point selected for player line annotation:", clickedPlayerId)
      }
      else{
        if (firstPoint === clickedPlayerId) {
          setFirstPoint(null) // Reset first point if the same player is clicked again
          return
        }
        logger.info("Adding player line annotation between players:", firstPoint, "and", clickedPlayerId)
        annotationStore.addPlayerLineAnnotation(firstPoint, clickedPlayerId, clipFrame)
        updateLines()
        onAnnotationUpdate?.()
        setFirstPoint(null) // Reset first point for the next line
      }
    }
    // if (editMode !== 'player_focus') return
    // if (!event?.points?.length) return
    // const pointIndex = event.points[0].pointIndex
    // console.log('Clicked point index:', pointIndex)
    // if (firstPoint === null) {
    //   console.log('Setting first point to index:', event.points[0])
    //   setFirstPoint(pointIndex)
    // }
    // else {
    //   // Add a line from firstPoint to pointIndex
    //   if (firstPoint === pointIndex) {
    //     console.log('Clicked the same point again, resetting first point.')
    //     setFirstPoint(null)
    //     return
    //   }
    //   annotationStore.addPlayerLineAnnotation(firstPoint, pointIndex, currentFrame)
    //   updateLines()
    //   onAnnotationUpdate?.()
    //   setFirstPoint(null) // Reset first point for the next line
    // }
    // return []
  }

  // Handles deletion of lines
  const handleRelayout = (eventData: any) => {
    console.log('Relayout event data:', eventData)
    // if ('dragmode' in eventData) {
    //   setDragMode(eventData['dragmode'])
    //   if (editMode === 'draw_rect' && eventData['dragmode'] !== 'drawrect') {
    //     setEditMode(null)
    //   }
    // }
    if ('shapes' in eventData) {
      annotationStore.handleAnnotationRelayout(eventData, clipFrame)
      updateLines()
      updateShapes()
      onAnnotationUpdate?.() 
    }
    //annotationStore.describeAnnotationStore() // For debugging - logs the current state of the annotation store after every relayout event
  }

  return (
    <div className="plot-container">
      <Plot
        data={[
          ...overlayTraces,
          ...playerTraces,
          ...(offBallRunTrace ? [offBallRunTrace] : []),
          {
            x: [frameData?.ball.ball_x],
            y: [frameData?.ball.ball_y],
            mode: 'markers+text',
            type: 'scatter',
            hovertemplate: 'Ball<extra></extra>',
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
          width: 900,
          height: 620,
          margin: { l: 20, r: 20, t: 20, b: 20 },
          paper_bgcolor: 'rgba(0, 0, 0, 0.3)',
          plot_bgcolor: 'rgba(0, 0, 0, 0.3)',
          showlegend: false,
          hovermode: 'closest',
          hoverdistance: 1,
          dragmode: dragMode as any,
          newshape: {
            line: {
              color: plotConfig.rectLineColor,
              width: plotConfig.rectLineWidth,
            },
            fillcolor: plotConfig.rectFillColor,
          } as any,
          shapes: [...lines, ...shapes], // Contains player focus lines
          images: isPitchBackgroundActive
            ? [
                {
                  source: image_src,
                  xref: 'x',
                  yref: 'y',
                  x: -56.5,
                  y: 38,
                  sizex: 113,
                  sizey: 76,
                  layer: 'below',
                  opacity: 0.4,
                  sizing: 'stretch',
                },
              ]
            : [],
        }}

        config={{
          editable: false,
          displayModeBar: true,
          modeBarButtonsToAdd: [player_focus_button, ...plotConfig.modeBarButtonsToAdd as any],
          modeBarButtonsToRemove: [...plotConfig.modeBarButtonsToRemove as any],
        }}
        onClick={handleClick}
        onRelayout={handleRelayout}
        onInitialized={handleGraphDiv}
        onUpdate={handleGraphDiv}
      />
    </div>
  )
}

export default PlotComponent