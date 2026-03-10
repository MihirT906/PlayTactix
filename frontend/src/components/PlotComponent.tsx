import React, { useState, useMemo, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import objectHash from "object-hash";


class AnnotationStore {
  annotations: Record<string, { frameStart: number; frameEnd: number | null; shape: object }>;

  constructor() {
    this.annotations = {};
  }

  addAnnotation(key: string, annotation: any) {
    this.annotations[key] = annotation;
  }

  removeAnnotation(key: string) {
    delete this.annotations[key];
  }

  getAnnotations() {
    return this.annotations;
  }
}

const annotationStore = new AnnotationStore(); // Create an instance of the store

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

  // useEffect(() => {
  //   console.log('Current focus points:', focusPoints)
  //   if (focusPoints.length > 1){
  //     console.log('Connection is possible')
  //     const newLine = {
  //       type: 'line',
  //       x0: x[focusPoints[0]], // Start x-coordinate
  //       y0: y[focusPoints[0]], // Start y-coordinate
  //       x1: x[focusPoints[focusPoints.length - 1]], // End x-coordinate
  //       y1: y[focusPoints[focusPoints.length - 1]], // End y-coordinate
  //       line: {
  //         color: 'blue',
  //         width: 2,
  //       },
  //       editable: true,
  //     }
  //     setLines([newLine])
  //     console.log('Lines state updated:', lines)
  //   } else {
  //     setLines([])
  //   }
  // }, [focusPoints, x, y]) // Logs the updated state whenever focusPoints changes

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
      console.log('Adding line from point', firstPoint, 'to point', pointIndex)
      const newLine = {
        type: 'line',
        x0: x[firstPoint], // Start x-coordinate
        y0: y[firstPoint], // Start y-coordinate
        x1: x[pointIndex], // End x-coordinate
        y1: y[pointIndex], // End y-coordinate
        line: {
          color: 'blue',
          width: 2,
        },
        editable: true,
      }
      setLines((prev) => [...prev, newLine]) // Add the new line to the existing lines
      setFirstPoint(null) // Reset first point for the next line
      console.log('Lines state updated:', lines)
    }
    // setFocusPoints((prev) => {
    //   if (prev.includes(pointIndex)) {
    //     return prev.filter((i) => i !== pointIndex)
    //   } else {
    //     return [...prev, pointIndex]
    //   }
    // })
    return []
  }

  const handleRelayout = (eventData: any) => {
    console.log('Relayout event data:', eventData)
    // if (eventData["shapes"]){
    //   eventData["shapes"].forEach((shape: any) => {
    //     console.log('Relayout shape data:', shape)
    //     const uniqueKey = objectHash(shape);

    //     const annotation = {
    //       frameStart: null,
    //       frameEnd: null,
    //       shape: shape
    //     };

    //     annotationStore.addAnnotation(uniqueKey, annotation)
    //     console.log('Current annotations in store:', annotationStore.getAnnotations())
    //   })
    // }
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
          selectedpoints: focusPoints,
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