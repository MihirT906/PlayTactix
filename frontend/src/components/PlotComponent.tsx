import React, { useState, useMemo, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import AnnotationStore from '../services/AnnotationStore'
import { SELECTED_POINTS_OPACITY, UNSELECTED_POINTS_OPACITY } from '../config'

const annotationStore = new AnnotationStore()

interface PlotComponentProps {
  currentFrame: number
  x: number[]
  y: number[]
}

const PlotComponent: React.FC<PlotComponentProps> = ({ currentFrame, x, y }) => {
  const [focusPoints, setFocusPoints] = useState<number[]>([]) // Points that are highlighted on click
  const [firstPoint, setFirstPoint] = useState<number | null>(null) // First point selected when drawing a line between two players
  const [focusEnabled, setFocusEnabled] = useState(false) // 'Player Focus' mode toggled to draw lines
  const [lines, setLines] = useState<any[]>([])
  const [shapes, setShapes] = useState<any[]>([])
  const [dragMode, setDragMode] = useState<string>('select')

  const player_focus_button = useMemo(() => ({ // Button to toggle 'Player Focus' mode
    name: 'Player Focus',
    icon: Plotly.Icons.tooltip_basic,
    click: () => {
        setFocusEnabled(prev => !prev)
      },
  }), [])

  const updateLines = () => { // Creates lines to add to Plotly.layout using the player focus lines stored in annotationStore
    setLines([]) // Clear existing lines before adding new ones
    setFocusPoints([]) // Clear existing focus points before adding new ones
    for (const [firstPoint, secondPoint] of annotationStore.getPlayerFocusLines(currentFrame) as [number, number][]) {
      setFocusPoints(prev => [...prev, firstPoint, secondPoint]) // Add all players that have lines connected to them to focusPoints
      const newLine = {
        type: 'line',
        x0: x[firstPoint], // Start x-coordinate
        y0: y[firstPoint], // Start y-coordinate
        x1: x[secondPoint], // End x-coordinate
        y1: y[secondPoint], // End y-coordinate
        line: {
          color: 'blue',
          width: 2,
        },
        editable: true,
        name: `Player1:${firstPoint},Player2:${secondPoint}`, // Using this name to identify the players connected by the line
      }
      setLines((prev) => [...prev, newLine]) // Add a new line based on updated player positions
    }
  }

  const updateShapes = () => {
    console.log("Annotation Store Draw Shapes:", annotationStore.getDrawAnnotations(currentFrame).values())
    const drawShapes = annotationStore.getDrawAnnotations(currentFrame)
    setShapes(Array.from(drawShapes)) // Update shapes based on the draw annotations in the store
  }

  useEffect(() => { // Lines have to be recreated every frame as player positions move
    updateLines()
    // updateShapes()
    setDragMode('select')
  }, [x, y]) 

  const handleClick = (event: any) => { // Allows the user to 'Focus' on a player or draw lines between them
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
      setFirstPoint(null) // Reset first point for the next line
    }
    return []
  }

  const handleRelayout = (eventData: any) => { // Handles deletion of lines
    console.log('Relayout event data:', eventData)
    if ('dragmode' in eventData) {
      setDragMode(eventData['dragmode'])
    }
    else if ('shapes' in eventData) {
      annotationStore.handleAnnotationRelayout(eventData, currentFrame)
      //annotationStore.deletePlayerFocusAnnotation(eventData)
      updateLines()
      updateShapes()
    }
  }

  return (
    <Plot
      data={[
        {
          x: x,
          y: y,
          mode: 'markers',
          type: 'scatter',
          marker: { 
            size: 10,
            opacity: 1
          },
          selectedpoints: [firstPoint].concat(focusPoints),
          selected: {
            marker: { opacity: SELECTED_POINTS_OPACITY },
          },
          unselected: {
            marker: { opacity: [firstPoint].concat(focusPoints).length > 0 ? UNSELECTED_POINTS_OPACITY: SELECTED_POINTS_OPACITY },
          },
        } as any,
      ]}
      layout={{
        title: { text: 'Scatter Plot' },
        xaxis: { title: { text: 'X Axis' }, range: [0, 100] },
        yaxis: { title: { text: 'Y Axis' }, range: [0, 100] },
        autosize: true,
        dragmode: dragMode as any,
        shapes: [...lines, ...shapes], // Contains player focus lines
      }}

      config={{
        editable: false,
        displayModeBar: true,
        modeBarButtonsToAdd: [player_focus_button,'drawline', 'drawrect', 'eraseshape' as any],
        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d' as any],
      }}
      onClick={handleClick}
      onRelayout={handleRelayout}
    />
  )
}

export default PlotComponent