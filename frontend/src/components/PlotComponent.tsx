import React, { useState, useMemo, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import AnnotationStore from '../services/AnnotationStore'

const annotationStore = new AnnotationStore()

interface PlotComponentProps {
  x: number[]
  y: number[]
}

const PlotComponent: React.FC<PlotComponentProps> = ({ x, y }) => {
  const [focusPoints, setFocusPoints] = useState<number[]>([])
  const [firstPoint, setFirstPoint] = useState<number | null>(null)
  const [focusEnabled, setFocusEnabled] = useState(false)
  const [lines, setLines] = useState<any[]>([])

  const player_focus_button = useMemo(() => ({
    name: 'Player Focus',
    icon: Plotly.Icons.tooltip_basic, //spikeline, ;;;;bullseye, certificate, chart-line, circle-nodes, dice-d20, people-arrows, 
    click: () => {
        setFocusEnabled(prev => !prev)
      },
  }), [])

  const updateLines = () => {
    console.log("Annotation Store Lines:", annotationStore.getPlayerFocusLines())
    setLines([])
    setFocusPoints([])
    for (const [firstPoint, secondPoint] of annotationStore.getPlayerFocusLines() as [number, number][]) {
      setFocusPoints(prev => [...prev, firstPoint, secondPoint])
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
        name: `Player1:${firstPoint},Player2:${secondPoint}`,
      }
      setLines((prev) => [...prev, newLine]) // Add the new line to the existing lines
    }
  }
  useEffect(() => {
    updateLines()
  }, [x, y]) // Logs the updated state whenever focusPoints changes

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
      annotationStore.addPlayerFocusAnnotation(firstPoint, pointIndex)
      updateLines()
      setFirstPoint(null) // Reset first point for the next line
      console.log('Lines state updated:', lines)
    }
    return []
  }

  const handleRelayout = (eventData: any) => {
    console.log('Relayout event data:', eventData)
    annotationStore.deletePlayerFocusAnnotation(eventData)
    updateLines()
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
            size: 10
          },
          selectedpoints: [firstPoint].concat(focusPoints),
        },
      ]}
      layout={{
        title: { text: 'Scatter Plot' }, // Updated to use an object
        xaxis: { title: { text: 'X Axis' }, range: [0, 100] }, // Updated to use an object
        yaxis: { title: { text: 'Y Axis' }, range: [0, 100] }, // Updated to use an object
        autosize: true,
        shapes: lines,
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