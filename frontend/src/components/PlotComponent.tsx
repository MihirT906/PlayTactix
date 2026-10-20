import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Plot from 'react-plotly.js'
import { Arrows, Comet, Pitch, Voronoi } from '@pitchkit/react'
import AnnotationStore from '../services/AnnotationStore-optimized'
import type { Event, FrameData } from '../types/FrameDataInterfaces'
import { APP_CONFIG, SELECTED_POINTS_OPACITY } from '../config'
// Import the background image
import backgroundImage from '../assets/background_image.png';
import type { MatchData } from '../types/MatchDataInterfaces'
import { useStyleConfig } from '../context/StyleConfigContext'
import { useMatchSession } from '../context/MatchSessionContext'
import { findOverlayAt } from '../services/clipManager'
import { buildPassOptionProbOverlay } from '../plot/overlays/passOptionProbOverlay'
import { buildPitchControlOverlay } from '../plot/overlays/pitchControlOverlay.ts'
import { buildEventMapItems, resolveEventMap } from '../plot/overlays/eventMapOverlay'
import { buildVoronoiPoints } from '../plot/overlays/voronoiOverlay'
import { EMPTY_SEQUENCE_TRAIL, buildTrailLinks, getSequenceTrailAt } from '../plot/overlays/sequenceTrailsOverlay'
import { buildFocusSpots } from '../plot/overlays/focusSpotlightOverlay'
import FocusSpotlight from './FocusSpotlight'
import PlayerLinks, { type PlayerLink } from './PlayerLinks'
import TeamShapes, { type TeamShapeGhost, type TeamShapeMark } from './TeamShapes'
import { SnapRing, type SnapTarget } from './pitchFx'
import { convexHull, polygonArea, polygonContains } from '../plot/overlays/teamShapeOverlay'

import { getLogger } from "../services/logger";

const logger = getLogger("PlotComponent");

// Plot geometry, shared by the Plotly layout and the PitchKit background so the two stay aligned.
const PLOT_WIDTH = 900
const PLOT_HEIGHT = 620
const PLOT_MARGIN = 20
const X_HALF_RANGE = 56.5 // metres from the centre spot to the edge of the plot area
const Y_HALF_RANGE = 38
const PLOT_BACKGROUND = 'rgba(0, 0, 0, 0.3)'
const DEFAULT_PITCH_LENGTH = 105
const DEFAULT_PITCH_WIDTH = 68

// Colours of the pre-rendered pitch image, so both renderers look alike.
const PITCHKIT_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  opacity: 0.4,
  '--pitch-surface': '#4cbb17',
  '--pitch-stripe': '#008000',
  '--pitch-lines': 'rgba(255, 255, 255, 0.75)',
  '--pitch-line-width': '1.5',
} as React.CSSProperties

// Layered beneath the Plotly plot when PitchKit draws the pitch.
const BACKDROP_STYLE: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', background: PLOT_BACKGROUND }
const BACKDROP_PLOT_AREA_STYLE: React.CSSProperties = { position: 'absolute', inset: PLOT_MARGIN, background: PLOT_BACKGROUND }

// A see-through PitchKit pitch stacked with the Plotly plot: it only carries PitchKit marks (arrow annotations, team shapes, sequence trails, the event map, voronoi cells, the focus spotlight).
const ARROW_LAYER_STYLE = {
  position: 'absolute',
  top: 0,
  left: 0,
  pointerEvents: 'none',
  '--pitch-surface': 'transparent',
  '--pitch-stripe': 'transparent',
  '--pitch-lines': 'transparent',
} as React.CSSProperties
// Catches the drag that draws an arrow, so Plotly doesn't start a selection underneath.
const ARROW_CAPTURE_STYLE: React.CSSProperties = { position: 'absolute', inset: 0, cursor: 'crosshair' }
const MIN_ARROW_LENGTH = 1 // metres; anything shorter is treated as a stray click
// Catches the pointer for the tools that pick players (Link Players, Team Shape), which snap to the
// nearest player rather than needing a click right on one.
const PICK_TOOLS = ['draw_line_players', 'team_shape']
const PICK_CAPTURE_STYLE: React.CSSProperties = { position: 'absolute', inset: 0 }
const PICK_SNAP_RADIUS = 3 // metres
// Link lines are drawn by PitchKit; Plotly keeps an invisible copy of each, this wide, to click to select and erase.
const LINK_HIT_WIDTH = 10

type ArrowShape = { x0: number; y0: number; x1: number; y1: number }

// Plot-relative pixels -> pitch metres, the inverse of the Plotly axis mapping set up in the layout below.
const pixelToPitch = (px: number, py: number) => {
  const x = -X_HALF_RANGE + ((px - PLOT_MARGIN) / (PLOT_WIDTH - 2 * PLOT_MARGIN)) * 2 * X_HALF_RANGE
  const y = Y_HALF_RANGE - ((py - PLOT_MARGIN) / (PLOT_HEIGHT - 2 * PLOT_MARGIN)) * 2 * Y_HALF_RANGE
  return {
    x: Math.max(-X_HALF_RANGE, Math.min(X_HALF_RANGE, x)),
    y: Math.max(-Y_HALF_RANGE, Math.min(Y_HALF_RANGE, y)),
  }
}

const CLICK_SLOP_PX = 4 // A press that moves further than this is a drag, not a click

// The index in the frame of the player whose marker is at (mx, my), pixels within the graph div, or -1.
const playerIndexAtPixel = (gd: any, fd: FrameData, overrides: Map<number, { x: number; y: number }>, mx: number, my: number, radius: number) => {
  const xa = gd._fullLayout.xaxis
  const ya = gd._fullLayout.yaxis
  let hitIndex = -1
  let bestDist = radius
  fd.players.player_id.forEach((playerId, i) => {
    const override = overrides.get(playerId)
    const px = xa.c2p(override?.x ?? fd.players.x[i]) + xa._offset
    const py = ya.c2p(override?.y ?? fd.players.y[i]) + ya._offset
    const dist = Math.hypot(px - mx, py - my)
    if (dist <= bestDist) {
      bestDist = dist
      hitIndex = i
    }
  })
  return hitIndex
}

// The key of the team shape at (mx, my), pixels within the graph div; of overlapping ones, the smallest.
const teamShapeAtPixel = (gd: any, shapes: TeamShapeMark[], mx: number, my: number) => {
  const xa = gd._fullLayout.xaxis
  const ya = gd._fullLayout.yaxis
  const point = { x: xa.p2c(mx - xa._offset), y: ya.p2c(my - ya._offset) }
  let hitKey: string | null = null
  let smallestArea = Infinity
  for (const shape of shapes) {
    const hull = convexHull(shape.points)
    const area = polygonArea(hull)
    if (area < smallestArea && polygonContains(hull, point)) {
      smallestArea = area
      hitKey = shape.key
    }
  }
  return hitKey
}

// Plotly bug workaround: every frame change hands Plotly new data arrays, so it does a full redraw, and a
// full redraw (shapes.draw) clears the 'above' and 'below' shape layers but never the 'between' layer that
// player lines are drawn in. Any 'between' shape whose index no longer exists in layout.shapes (a line
// scrubbed back past its start, or the clip looping) is therefore left on the canvas frozen, on every frame.
// Sweep those orphans after each update; indices that still exist are redrawn by Plotly itself.
const removeOrphanedBetweenShapes = (gd: HTMLElement, shapeCount: number) => {
  gd.querySelectorAll('.layer-between .shapelayer [data-index]').forEach((node) => {
    if (Number(node.getAttribute('data-index')) >= shapeCount) node.remove()
  })
}

interface PlotComponentProps {
  currentFrame: number
  clipFrame: number
  frameData: FrameData | null
  matchData: MatchData | null
  matchEvents: Event[] | null // Every event of the match, for overlays that look beyond the current frame
  annotationStore: AnnotationStore
  annotationVersion?: number // Bumped when annotations change elsewhere (e.g. timeline bar drags/deletes)
  onAnnotationUpdate?: () => void // Optional callback to trigger when annotations are updated
}

const PlotComponent: React.FC<PlotComponentProps> = ({ currentFrame, clipFrame, matchData, frameData, matchEvents, annotationStore, onAnnotationUpdate, annotationVersion }) => {
  const plotConfig = APP_CONFIG.plot
  const { homeTeamColor, awayTeamColor, eventStyles, teamVisibility, eventVisibility, pitchRenderer } = useStyleConfig()
  const { session, resources } = useMatchSession()
  const overlayManager = resources.overlayManager
  const [focusPoints, setFocusPoints] = useState<number[]>([]) // Points that are highlighted on click
  const [firstPoint, setFirstPoint] = useState<number | null>(null) // First point selected when drawing a line between two players
  // The team shape being built in 'Team Shape' mode: the players clicked so far and, once there are enough to draw, its key in the store
  const [shapePlayers, setShapePlayers] = useState<number[]>([])
  const shapeKeyRef = useRef<string | null>(null)
  // const [focusEnabled, setFocusEnabled] = useState(false) // 'Player Focus' mode toggled to draw lines
  // Bumped whenever the annotation store is edited from this component, so the derived lines/shapes below recompute
  const [annotationTick, setAnnotationTick] = useState(0)
  const [dragMode, setDragMode] = useState<string>('select')
  const [draftArrow, setDraftArrow] = useState<ArrowShape | null>(null) // Arrow being dragged out, not yet in the store
  const [pickCursor, setPickCursor] = useState<{ x: number; y: number } | null>(null) // Pointer in pitch metres, while a pick tool is on
  const [activeShapeIndex, setActiveShapeIndex] = useState<number | null>(null) // The shape Plotly has selected, for erasing
  // The team shape selected for erasing. Team shapes are drawn by PitchKit, so they are selected here
  // rather than by Plotly; at most one of the two selections is ever set.
  const [selectedTeamShapeKey, setSelectedTeamShapeKey] = useState<string | null>(null)
  const pointerDownRef = useRef<{ clientX: number; clientY: number; onPlotlyShape: boolean } | null>(null)
  const teamShapesRef = useRef<TeamShapeMark[]>([])
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
  // A type can have several segments on the clip; it shows when any of them covers this frame.
  const isPitchBackgroundActive = findOverlayAt(session.playback.clip, 'pitch', clipFrame) !== undefined
  const isPitchControlActive = findOverlayAt(session.playback.clip, 'pitch_control', clipFrame) !== undefined
  const isPassOptionProbActive = findOverlayAt(session.playback.clip, 'pass_option_prob', clipFrame) !== undefined
  const sequenceTrailsOverlay = findOverlayAt(session.playback.clip, 'sequence_trails', clipFrame)
  const isVoronoiActive = findOverlayAt(session.playback.clip, 'voronoi', clipFrame) !== undefined
  // Annotation tools only work while paused: the selected tool is suspended during playback and back on pause.
  const selectedTool = session.ui.editMode
  const editMode = isPlaying ? null : selectedTool
  const usePitchKit = pitchRenderer === 'pitchkit'

  // Padding that places the PitchKit pitch exactly where Plotly's axes put the same metres.
  const pitchKitProps = useMemo(() => {
    const inRange = (value: number | undefined, halfRange: number): value is number =>
      typeof value === 'number' && value > 0 && value / 2 <= halfRange
    const length = inRange(matchData?.pitch_length, X_HALF_RANGE) ? matchData.pitch_length : DEFAULT_PITCH_LENGTH
    const width = inRange(matchData?.pitch_width, Y_HALF_RANGE) ? matchData.pitch_width : DEFAULT_PITCH_WIDTH
    const insetX = PLOT_MARGIN + ((X_HALF_RANGE - length / 2) * (PLOT_WIDTH - 2 * PLOT_MARGIN)) / (2 * X_HALF_RANGE)
    const insetY = PLOT_MARGIN + ((Y_HALF_RANGE - width / 2) * (PLOT_HEIGHT - 2 * PLOT_MARGIN)) / (2 * Y_HALF_RANGE)
    return {
      dimensions: { length, width },
      padding: { top: insetY, right: insetX, bottom: insetY, left: insetX },
    }
  }, [matchData?.pitch_length, matchData?.pitch_width])

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

  // Lookup of player id -> display info (name, position, shirt number) sourced from matchData
  const playerInfoById = useMemo(() => {
    const map = new Map<number, { name: string; position: string; number: number | null }>()
    for (const player of matchData?.players || []) {
      map.set(player.id, {
        name: player.short_name || '',
        position: player.player_role?.acronym || '',
        number: player.number ?? null,
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
        // Shirt number inside the marker, in the number colour of that team's kit.
        text: visiblePlayerIds.map((playerId) => playerInfoById.get(playerId)?.number?.toString() ?? ''),
        textposition: 'middle center',
        textfont: {
          size: plotConfig.playerNumberFontSize,
          color: filterByMask(players.team, mask).map((team) => {
            const kit = team === 'home' ? matchData?.home_team_kit : team === 'away' ? matchData?.away_team_kit : undefined
            return kit?.number_color || plotConfig.playerNumberColor
          }),
        },
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

      // Draws a halo ring (with a gap from the marker) around the players of the team shape being built
      // and the first player picked for a link. Focused players get the spotlight instead.
      const highlightedIndices = [...new Set([...shapePlayers, ...(firstPoint !== null ? [firstPoint] : [])])]
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
  }, [awayTeamColor, eventStyles.onBallEngagement.color, eventStyles.onBallEngagement.width, eventStyles.passingOption.color, eventStyles.passingOption.width, eventStyles.playerPossession.color, eventStyles.playerPossession.width, eventVisibility.onBallEngagement, eventVisibility.passingOption, eventVisibility.playerPossession, frameData, homeTeamColor, matchData, playerMasks, teamVisibility.away, teamVisibility.home, shapePlayers, firstPoint, positionOverrides])

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

      if (!cancelled) {
        setOverlayTraces(traces);
      }
    }

    loadOverlays();

    return () => {
      cancelled = true;
    };
  }, [isPassOptionProbActive, isPitchControlActive, frameData, currentFrame, overlayManager, eventStyles.passingOption.color, homeTeamColor, awayTeamColor, matchData]);

  // A new frame's plot represents real tracked positions, so drop any temporary drag edits from the
  // previous (paused) frame. The annotation tool stays on, so a move can be marked up frame by frame.
  useEffect(() => {
    setPositionOverrides((prev) => (prev.size > 0 ? new Map() : prev))
  }, [frameData, clipFrame])

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

  // Switching tools (not just pausing one for playback) ends what the previous tool was building.
  useEffect(() => {
    setSelectedTeamShapeKey(null)
    // Leaving 'Team Shape' finishes the shape being built; the next one starts from no players.
    if (selectedTool !== 'team_shape') {
      shapeKeyRef.current = null
      setShapePlayers((prev) => (prev.length > 0 ? [] : prev))
    }
    // Likewise leaving 'Link Players' drops a first player still waiting for a second.
    if (selectedTool !== 'draw_line_players') {
      setFirstPoint(null)
    }
    if (!PICK_TOOLS.includes(selectedTool ?? '')) {
      setPickCursor(null)
    }
  }, [selectedTool])

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

  // The positions in this frame of a team shape's players that are in it.
  const teamShapePoints = (players: number[]) =>
    players.flatMap((playerId) => {
      const { x, y } = resolvePlayerPos(playerId)
      return x === undefined || y === undefined ? [] : [{ x, y }]
    })

  // A team shape is in the colour of its players' team, or a neutral one when it spans both.
  const teamShapeColor = (players: number[]) => {
    const teams = new Set(players.map((playerId) => frameData?.players.team[frameData.players.player_id.indexOf(playerId)]))
    const team = teams.size === 1 ? [...teams][0] : undefined
    return team === 'home' ? homeTeamColor : team === 'away' ? awayTeamColor : plotConfig.teamShapeColor
  }

  // Annotation shapes for the current frame, derived (never stored) so they cannot go stale: the
  // store's active set is rebuilt for this clip frame, and player lines are placed from this frame's
  // positions. Lines whose players aren't in the frame (e.g. missing data) are skipped.
  const { lines, links, shapes, arrows, teamShapes } = useMemo(() => {
    annotationStore.reconstruct_active_annotations(clipFrame)
    // Each player line twice: PitchKit draws it (links) and Plotly holds an invisible copy (lines) to select
    // and erase it by. The two stay index-aligned.
    const lines: any[] = []
    const links: PlayerLink[] = []
    for (const { key, players: [firstPoint, secondPoint] } of annotationStore.getPlayerLineAnnotations(clipFrame)) {
      if (firstPoint === undefined || secondPoint === undefined) continue
      const { x: x0, y: y0 } = resolvePlayerPos(firstPoint)
      const { x: x1, y: y1 } = resolvePlayerPos(secondPoint)
      if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) continue

      links.push({ key, a: { x: x0, y: y0 }, b: { x: x1, y: y1 } })
      lines.push({
        type: 'line',
        layer: 'between',
        x0,
        y0,
        x1,
        y1,
        line: {
          color: 'rgba(0, 0, 0, 0)',
          width: LINK_HIT_WIDTH,
        },
        editable: true,
        name: `Player1:${firstPoint},Player2:${secondPoint}`, // Using this name to identify the players connected by the line
      })
    }
    // A team shape is the hull around its players' positions in this frame. It needs three of them in
    // the frame to enclose an area.
    const teamShapes = annotationStore.getTeamShapeAnnotations(clipFrame).flatMap(({ key, players }): TeamShapeMark[] => {
      const points = teamShapePoints(players)
      return points.length < 3 ? [] : [{ key, players, points, color: teamShapeColor(players) }]
    })
    return {
      lines,
      links,
      shapes: Array.from(annotationStore.getDrawAnnotations(clipFrame)) as any[],
      arrows: annotationStore.getArrowAnnotations(clipFrame),
      teamShapes,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotationStore, clipFrame, frameData, positionOverrides, annotationTick, annotationVersion, homeTeamColor, awayTeamColor])

  // Plotly's selected shape, when it is one of the player lines (they come first in layout.shapes).
  const selectedLinkKey = activeShapeIndex !== null && activeShapeIndex < links.length ? links[activeShapeIndex].key : null
  // A selected team shape that has since gone (its bar ended, or it was deleted) is no longer selected.
  const selectedShapeKey = teamShapes.some((shape) => shape.key === selectedTeamShapeKey) ? selectedTeamShapeKey : null
  teamShapesRef.current = teamShapes

  // While a pick tool is on, the visible player nearest the pointer, if close enough to pick. Link
  // Players leaves out the first player already picked.
  const pickSnapTarget = useMemo((): SnapTarget | null => {
    if (!PICK_TOOLS.includes(editMode ?? '') || !pickCursor || !frameData) return null
    const visible = getVisibleTeamMask(frameData.players.team)
    let nearest: SnapTarget | null = null
    let nearestDistance = PICK_SNAP_RADIUS
    frameData.players.player_id.forEach((playerId, index) => {
      if (!visible[index] || (editMode === 'draw_line_players' && playerId === firstPoint)) return
      const { x, y } = resolvePlayerPos(playerId)
      if (x === undefined || y === undefined) return
      const distance = Math.hypot(x - pickCursor.x, y - pickCursor.y)
      if (distance <= nearestDistance) {
        nearestDistance = distance
        nearest = { playerId, x, y }
      }
    })
    return nearest
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pickCursor, frameData, firstPoint, positionOverrides, teamVisibility])

  // The line stretched from the first player picked to the snapped player, or else the pointer.
  const linkDraft = useMemo(() => {
    if (editMode !== 'draw_line_players' || firstPoint === null) return null
    const { x, y } = resolvePlayerPos(firstPoint)
    const to = pickSnapTarget ?? pickCursor
    if (x === undefined || y === undefined || !to) return null
    return { from: { x, y }, to }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, firstPoint, pickSnapTarget, pickCursor, frameData, positionOverrides])

  // The shape being built as it would be if the snapped player were picked, or let go if already in it.
  const teamShapeGhost = useMemo((): TeamShapeGhost | null => {
    if (editMode !== 'team_shape' || !pickSnapTarget) return null
    const players = toggledShapePlayers(pickSnapTarget.playerId)
    const points = teamShapePoints(players)
    return points.length < 2 ? null : { key: String(pickSnapTarget.playerId), points, color: teamShapeColor(players) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pickSnapTarget, shapePlayers, frameData, positionOverrides, homeTeamColor, awayTeamColor])

  const trailLinks = useMemo(() => buildTrailLinks(matchEvents), [matchEvents])

  // A sequence is the range of the overlay's bar on the clip timeline: its trail grows from the bar's
  // start and every carry and pass stays drawn until the bar ends.
  const sequenceTrail = useMemo(() => {
    if (!sequenceTrailsOverlay) return EMPTY_SEQUENCE_TRAIL
    // The match frame the sequence starts at. A bar reaching back over an earlier match segment starts
    // with this one, since the footage before it is not continuous with what is on screen.
    const matchSegment = session.playback.clip.matchSegments.find((s) => clipFrame >= s.clipStart && clipFrame <= s.clipEnd)
    const sequenceStartClipFrame = Math.max(sequenceTrailsOverlay.clipStart, matchSegment?.clipStart ?? 0)
    return getSequenceTrailAt(trailLinks, currentFrame, currentFrame - (clipFrame - sequenceStartClipFrame), (link) => {
      // A carry in progress ends at its carrier and a pass in flight at the ball.
      const { x, y } = link.kind === 'carry'
        ? resolvePlayerPos(link.playerId)
        : { x: frameData?.ball.ball_x, y: frameData?.ball.ball_y }
      return typeof x === 'number' && typeof y === 'number' ? { x, y } : null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailLinks, sequenceTrailsOverlay, session.playback.clip.matchSegments, currentFrame, clipFrame, frameData, positionOverrides])
  // Focused players, each trailed back to the start of the match segment on screen at most, so a
  // trail never crosses a cut in the clip.
  const focusSpots = useMemo(() => {
    const matchSegment = session.playback.clip.matchSegments.find((s) => clipFrame >= s.clipStart && clipFrame <= s.clipEnd)
    const segmentStartFrame = matchSegment ? currentFrame - (clipFrame - matchSegment.clipStart) : currentFrame
    return buildFocusSpots(focusPoints, currentFrame, segmentStartFrame, (frame) => resources.dataManager.getBufferedFrame(frame), resolvePlayerPos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPoints, session.playback.clip.matchSegments, currentFrame, clipFrame, frameData, positionOverrides, resources.dataManager])
  const teamColor = <T extends { teamId: number }>(item: T) => (item.teamId === matchData?.away_team.id ? awayTeamColor : homeTeamColor)

  // One cell per player, following any dragged positions so the cells can be explored while paused.
  const voronoiPoints = useMemo(
    () => (isVoronoiActive ? buildVoronoiPoints(frameData, positionOverrides) : []),
    [isVoronoiActive, frameData, positionOverrides],
  )

  const eventMapItems = useMemo(() => buildEventMapItems(matchEvents), [matchEvents])
  const eventMapDrawn = useMemo(
    () =>
      resolveEventMap(
        eventMapItems,
        session.overlays.eventMapFilters,
        session.overlays.eventMapExcludedIds,
        session.playback.clip.matchSegments,
      ).drawn,
    [eventMapItems, session.overlays.eventMapFilters, session.overlays.eventMapExcludedIds, session.playback.clip.matchSegments],
  )
  // The Event Map split by how it is drawn: the ball moving (a pass) as a comet, a player moving (a
  // carry or an off ball run) as an arrow.
  const eventMap = useMemo(() => {
    const visible = session.overlays.autoDisappearEvents
      ? eventMapDrawn.filter((event) => currentFrame <= event.frameEnd)
      : eventMapDrawn
    return {
      passes: visible.filter((event) => event.kind === 'pass'),
      movements: visible.filter((event) => event.kind !== 'pass'),
    }
  }, [eventMapDrawn, session.overlays.autoDisappearEvents, currentFrame])

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
    x = Math.max(-X_HALF_RANGE, Math.min(X_HALF_RANGE, x))
    y = Math.max(-Y_HALF_RANGE, Math.min(Y_HALF_RANGE, y))
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
    const rect = gd.getBoundingClientRect()
    const hitIndex = playerIndexAtPixel(gd, fd, overrides, e.clientX - rect.left, e.clientY - rect.top, DRAG_HIT_RADIUS_PX)
    if (hitIndex === -1) return // not on a player - let Plotly handle the event

    e.stopPropagation()
    e.preventDefault()
    dragStateRef.current = { playerId: fd.players.player_id[hitIndex] }
    gd.style.cursor = 'grabbing'
    window.addEventListener('mousemove', onDragMove, true)
    window.addEventListener('mouseup', endDrag, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAG_HIT_RADIUS_PX, onDragMove, endDrag])

  // Show a grab cursor when hovering a player while paused, and a pointer over a team shape to select
  const onHoverCursor = useCallback((e: MouseEvent) => {
    const { frameData: fd, isPlaying: playing, positionOverrides: overrides, editMode: mode } = dragDepsRef.current
    const gd = graphDivRef.current
    if (!gd?._fullLayout || dragStateRef.current) return
    if (playing || !fd || mode !== null) {
      gd.style.cursor = ''
      return
    }
    const rect = gd.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    if (playerIndexAtPixel(gd, fd, overrides, mx, my, DRAG_HIT_RADIUS_PX) !== -1) gd.style.cursor = 'grab'
    else gd.style.cursor = teamShapeAtPixel(gd, teamShapesRef.current, mx, my) ? 'pointer' : ''
  }, [DRAG_HIT_RADIUS_PX])

  // Plotly selects a shape on click without any event, so its selection is read back after every
  // redraw and click, for the PitchKit-drawn player lines to show it. A Plotly selection clears a team shape's.
  const syncActiveShape = useCallback(() => {
    const index = graphDivRef.current?._fullLayout?._activeShapeIndex
    const active = typeof index === 'number' && index >= 0
    setActiveShapeIndex(active ? index : null)
    if (active) setSelectedTeamShapeKey(null)
  }, [])

  const onPointerDown = useCallback((e: MouseEvent) => {
    const onPlotlyShape = e.target instanceof Element && e.target.closest('.shapelayer') !== null
    pointerDownRef.current = { clientX: e.clientX, clientY: e.clientY, onPlotlyShape }
  }, [])

  // A click with no tool on selects the team shape under it, or clears the selection on empty pitch.
  // A click on a Plotly shape is Plotly's to select, and on a player leaves the selection alone. Runs a
  // frame later, once Plotly has handled the click. Listened for on the window: Plotly covers the page
  // with its own element while the button is down, so the release never reaches the graph div.
  const onPlotMouseUp = useCallback((e: MouseEvent) => {
    const down = pointerDownRef.current
    if (down === null) return // The press began outside the plot
    pointerDownRef.current = null
    requestAnimationFrame(() => {
      const gd = graphDivRef.current
      const { frameData: fd, positionOverrides: overrides, editMode: mode } = dragDepsRef.current
      const isClick = Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) <= CLICK_SLOP_PX
      if (isClick && down.onPlotlyShape) {
        setSelectedTeamShapeKey(null)
      } else if (isClick && mode === null && fd && gd?._fullLayout) {
        const rect = gd.getBoundingClientRect()
        const mx = down.clientX - rect.left
        const my = down.clientY - rect.top
        if (playerIndexAtPixel(gd, fd, overrides, mx, my, DRAG_HIT_RADIUS_PX) === -1) {
          const key = teamShapeAtPixel(gd, teamShapesRef.current, mx, my)
          if (key) gd._fullLayout._deactivateShape?.(gd)
          setSelectedTeamShapeKey(key)
        }
      }
      syncActiveShape()
    })
  }, [DRAG_HIT_RADIUS_PX, syncActiveShape])

  // Bind the imperative pointer handlers once we have the Plotly graph div
  const handleGraphDiv = useCallback((figure: any, gd: any) => {
    if (!gd) return
    removeOrphanedBetweenShapes(gd, figure?.layout?.shapes?.length ?? 0)
    if (graphDivRef.current !== gd) {
      graphDivRef.current = gd
      gd.addEventListener('mousedown', onPointerDown, true)
      gd.addEventListener('mousedown', onDragStart, true)
      gd.addEventListener('mousemove', onHoverCursor)
      window.addEventListener('mouseup', onPlotMouseUp, true)
    }
    syncActiveShape()
  }, [onPointerDown, onDragStart, onHoverCursor, onPlotMouseUp, syncActiveShape])

  useEffect(() => {
    return () => {
      const gd = graphDivRef.current
      if (!gd) return
      gd.removeEventListener('mousedown', onPointerDown, true)
      gd.removeEventListener('mousedown', onDragStart, true)
      gd.removeEventListener('mousemove', onHoverCursor)
      window.removeEventListener('mouseup', onPlotMouseUp, true)
      window.removeEventListener('mousemove', onDragMove, true)
      window.removeEventListener('mouseup', endDrag, true)
    }
  }, [onPointerDown, onDragStart, onHoverCursor, onDragMove, endDrag, onPlotMouseUp])

  // Erasing the shape a user has clicked/selected on the plot (Plotly's own
  // "active shape" concept) has no public JS API - the only place that logic
  // lives is inside the click handler of Plotly's own 'eraseshape' modebar
  // button (kept registered - see modeBarButtonsToAdd below - but hidden from
  // view via CSS). So an external "Erase Active Shape" button elsewhere in the
  // UI (see WorkspaceSidebar) can't call into Plotly directly; instead it
  // reaches this component through resources.plotActions and we just click
  // Plotly's own hidden button on its behalf, letting Plotly do the erase and
  // emit the plotly_relayout that handleRelayout already knows how to handle.
  // A selected team shape is erased here instead, from this frame on, as Plotly erases its own shapes.
  useEffect(() => {
    resources.plotActions.eraseActiveShape = () => {
      if (selectedShapeKey) {
        annotationStore.endAnnotation(selectedShapeKey, clipFrame)
        setSelectedTeamShapeKey(null)
        setAnnotationTick((tick) => tick + 1)
        onAnnotationUpdate?.()
        return
      }
      const gd = graphDivRef.current
      if (!gd) return
      const eraseButton = gd.querySelector('.modebar-btn[data-title="Erase active shape"]') as HTMLElement | null
      eraseButton?.click()
    }
    return () => {
      if (resources.plotActions.eraseActiveShape) resources.plotActions.eraseActiveShape = null
    }
  }, [resources, selectedShapeKey, annotationStore, clipFrame, onAnnotationUpdate])

  // Draws an arrow by dragging on the pitch: press for the tail, release for the head
  const handleArrowMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const toPitch = (ev: { clientX: number; clientY: number }) => pixelToPitch(ev.clientX - rect.left, ev.clientY - rect.top)
    const start = toPitch(e)
    let end = start
    setDraftArrow({ x0: start.x, y0: start.y, x1: end.x, y1: end.y })

    const onMove = (ev: MouseEvent) => {
      end = toPitch(ev)
      setDraftArrow({ x0: start.x, y0: start.y, x1: end.x, y1: end.y })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
      setDraftArrow(null)
      if (Math.hypot(end.x - start.x, end.y - start.y) < MIN_ARROW_LENGTH) return
      annotationStore.addArrowAnnotation(start.x, start.y, end.x, end.y, clipFrame)
      setAnnotationTick((tick) => tick + 1)
      onAnnotationUpdate?.()
    }
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mouseup', onUp, true)
  }

  // Link Players: the first player picked waits for a second, then the two are linked. Picking the
  // first again lets it go.
  const pickLinkPlayer = (playerId: number) => {
    if (firstPoint === null) {
      setFirstPoint(playerId)
      logger.info("First point selected for player line annotation:", playerId)
      return
    }
    if (firstPoint === playerId) {
      setFirstPoint(null)
      return
    }
    logger.info("Adding player line annotation between players:", firstPoint, "and", playerId)
    annotationStore.addPlayerLineAnnotation(firstPoint, playerId, clipFrame)
    setAnnotationTick((tick) => tick + 1)
    onAnnotationUpdate?.()
    setFirstPoint(null)
  }

  // Team Shape: picking a player adds them to the shape being built, picking them again takes them out.
  function toggledShapePlayers(playerId: number) {
    return shapePlayers.includes(playerId) ? shapePlayers.filter((p) => p !== playerId) : [...shapePlayers, playerId]
  }

  const pickShapePlayer = (playerId: number) => {
    const players = toggledShapePlayers(playerId)
    setShapePlayers(players)
    shapeKeyRef.current = annotationStore.setTeamShapePlayers(shapeKeyRef.current, players, clipFrame)
    setAnnotationTick((tick) => tick + 1)
    onAnnotationUpdate?.()
  }

  const handlePickMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPickCursor(pixelToPitch(e.clientX - rect.left, e.clientY - rect.top))
  }

  const handlePickClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editMode === 'team_shape') {
      if (pickSnapTarget) pickShapePlayer(pickSnapTarget.playerId)
      return
    }
    if (pickSnapTarget) {
      pickLinkPlayer(pickSnapTarget.playerId)
      return
    }
    // The first player picked for a link is left out of pickSnapTarget, so it is found again here to let it go.
    if (firstPoint === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cursor = pixelToPitch(e.clientX - rect.left, e.clientY - rect.top)
    const { x, y } = resolvePlayerPos(firstPoint)
    if (x !== undefined && y !== undefined && Math.hypot(x - cursor.x, y - cursor.y) <= PICK_SNAP_RADIUS) pickLinkPlayer(firstPoint)
  }

  // Allows the user to 'Focus' on a player (Link Players and Team Shape clicks go through handlePickClick instead)
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
      setAnnotationTick((tick) => tick + 1)
      onAnnotationUpdate?.() 
    }
    //annotationStore.describeAnnotationStore() // For debugging - logs the current state of the annotation store after every relayout event
  }

  return (
    <div className="plot-container">
      <div style={{ position: 'relative', display: 'flex' }}>
        {usePitchKit && (
          // Plotly's own backgrounds are transparent in this mode, so the same tints are painted here, under the pitch.
          <div style={BACKDROP_STYLE}>
            <div style={BACKDROP_PLOT_AREA_STYLE} />
            {isPitchBackgroundActive && (
              <Pitch
                type="skillcorner"
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                dimensions={pitchKitProps.dimensions}
                padding={pitchKitProps.padding}
                appearance={{ stripes: true }}
                style={PITCHKIT_STYLE}
              />
            )}
          </div>
        )}
        {(voronoiPoints.length > 0 || sequenceTrail.carries.length > 0 || sequenceTrail.passes.length > 0 || eventMap.passes.length > 0 || eventMap.movements.length > 0) && (
          // Voronoi cells, sequence trails and the event map sit on their own see-through pitch beneath the Plotly plot, so players stay on top.
          <Pitch
            type="skillcorner"
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            dimensions={pitchKitProps.dimensions}
            padding={pitchKitProps.padding}
            style={ARROW_LAYER_STYLE}
          >
            <Voronoi
              data={voronoiPoints}
              x={(d) => d.x}
              y={(d) => d.y}
              fill={(d) => (d.team === 'away' ? awayTeamColor : homeTeamColor)}
              fillOpacity={plotConfig.voronoiFillOpacity}
              stroke={plotConfig.voronoiStrokeColor}
              strokeWidth={plotConfig.voronoiStrokeWidth}
            />
            <Comet
              data={sequenceTrail.passes}
              x={(d) => d.x}
              y={(d) => d.y}
              x2={(d) => d.x2}
              y2={(d) => d.y2}
              color={teamColor}
              endWidth={plotConfig.sequenceTrailPassWidth}
              gradient
            />
            <Arrows
              data={sequenceTrail.carries}
              x={(d) => d.x}
              y={(d) => d.y}
              x2={(d) => d.x2}
              y2={(d) => d.y2}
              stroke={teamColor}
              strokeWidth={plotConfig.sequenceTrailCarryWidth}
              headSize={plotConfig.sequenceTrailCarryHeadSize}
            />
            <Comet
              data={eventMap.passes}
              x={(d) => d.x}
              y={(d) => d.y}
              x2={(d) => d.x2}
              y2={(d) => d.y2}
              color={teamColor}
              endWidth={plotConfig.eventMapPassWidth}
              gradient
            />
            <Arrows
              data={eventMap.movements}
              x={(d) => d.x}
              y={(d) => d.y}
              x2={(d) => d.x2}
              y2={(d) => d.y2}
              stroke={teamColor}
              strokeWidth={plotConfig.eventMapArrowWidth}
              strokeOpacity={(d) => (d.kind === 'off_ball_run' ? plotConfig.eventMapRunOpacity : 1)}
              headSize={plotConfig.eventMapArrowHeadSize}
            />
          </Pitch>
        )}
        {/* Always mounted, so a spotlight or player line can play its exit after the last one goes. */}
        <Pitch
          type="skillcorner"
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          dimensions={pitchKitProps.dimensions}
          padding={pitchKitProps.padding}
          style={ARROW_LAYER_STYLE}
        >
          <TeamShapes shapes={teamShapes} selectedKey={selectedShapeKey} ghost={teamShapeGhost} strokeWidth={plotConfig.teamShapeStrokeWidth} />
          <FocusSpotlight spots={focusSpots} />
          <PlayerLinks links={links} selectedKey={selectedLinkKey} draft={linkDraft} color={plotConfig.focusLineColor} />
          {pickSnapTarget && (
            <SnapRing
              key={pickSnapTarget.playerId}
              target={pickSnapTarget}
              color={editMode === 'team_shape' ? teamShapeGhost?.color ?? plotConfig.teamShapeColor : plotConfig.focusLineColor}
            />
          )}
        </Pitch>
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
            xaxis: { range: [-X_HALF_RANGE, X_HALF_RANGE], showgrid: false, visible: false },
            yaxis: { range: [-Y_HALF_RANGE, Y_HALF_RANGE], showgrid: false, visible: false },
            width: PLOT_WIDTH,
            height: PLOT_HEIGHT,
            margin: { l: PLOT_MARGIN, r: PLOT_MARGIN, t: PLOT_MARGIN, b: PLOT_MARGIN },
            paper_bgcolor: usePitchKit ? 'rgba(0, 0, 0, 0)' : PLOT_BACKGROUND,
            plot_bgcolor: usePitchKit ? 'rgba(0, 0, 0, 0)' : PLOT_BACKGROUND,
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
            images: isPitchBackgroundActive && !usePitchKit
              ? [
                  {
                    source: image_src,
                    xref: 'x',
                    yref: 'y',
                    x: -X_HALF_RANGE,
                    y: Y_HALF_RANGE,
                    sizex: 2 * X_HALF_RANGE,
                    sizey: 2 * Y_HALF_RANGE,
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
            modeBarButtonsToAdd: [...plotConfig.modeBarButtonsToAdd as any],
            modeBarButtonsToRemove: [...plotConfig.modeBarButtonsToRemove as any],
          }}
          onClick={handleClick}
          onRelayout={handleRelayout}
          onInitialized={handleGraphDiv}
          onUpdate={handleGraphDiv}
        />
        {(arrows.length > 0 || draftArrow) && (
          <Pitch
            type="skillcorner"
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            dimensions={pitchKitProps.dimensions}
            padding={pitchKitProps.padding}
            style={ARROW_LAYER_STYLE}
          >
            <Arrows
              data={draftArrow ? [...arrows, draftArrow] : arrows}
              x={(d) => d.x0}
              y={(d) => d.y0}
              x2={(d) => d.x1}
              y2={(d) => d.y1}
              stroke={plotConfig.arrowColor}
              strokeWidth={plotConfig.arrowWidth}
              headSize={plotConfig.arrowHeadSize}
            />
          </Pitch>
        )}
        {editMode === 'draw_arrow' && <div style={ARROW_CAPTURE_STYLE} onMouseDown={handleArrowMouseDown} />}
        {PICK_TOOLS.includes(editMode ?? '') && (
          <div
            style={{ ...PICK_CAPTURE_STYLE, cursor: pickSnapTarget ? 'pointer' : 'crosshair' }}
            onMouseMove={handlePickMouseMove}
            onMouseLeave={() => setPickCursor(null)}
            onClick={handlePickClick}
          />
        )}
      </div>
    </div>
  )
}

export default PlotComponent