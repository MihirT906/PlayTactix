import React, { useState, useMemo, useEffect } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'

interface PlotComponentProps {
  x: number[]
  y: number[]
}

const PlotComponent: React.FC<PlotComponentProps> = ({ x, y }) => {
  const [focusPoints, setFocusPoints] = useState<number[]>([0,1]) 
  const [focusEnabled, setFocusEnabled] = useState(false)
  const [lines, setLines] = useState<any[]>([])
  const [connectedPlayers, setConnectedPlayers] = useState<{ from: number; to: number }[]>([])
  const [connectionEnabled, setConnectionEnabled] = useState(false)


  const player_focus_button = useMemo(() => ({
    name: 'Player Focus',
    icon: Plotly.Icons.tooltip_basic, //spikeline, ;;;;bullseye, certificate, chart-line, circle-nodes, dice-d20, people-arrows, 
    click: () => {
        setFocusEnabled(prev => !prev)
      },
  }), [])

  // const connect_players_button = useMemo(() => ({
  //   name: 'Connect Players',
  //   icon: Plotly.Icons.spikeline,
  //   click: () => {
  //       setConnectionEnabled(prev => !prev)
  //     },
  // }), [])

  useEffect(() => {
    console.log('Current focus points:', focusPoints)
    if (focusPoints.length > 1){
      console.log('Connection is possible')
      const newLine = {
        type: 'line',
        x0: x[focusPoints[0]], // Start x-coordinate
        y0: y[focusPoints[0]], // Start y-coordinate
        x1: x[focusPoints[focusPoints.length - 1]], // End x-coordinate
        y1: y[focusPoints[focusPoints.length - 1]], // End y-coordinate
        line: {
          color: 'blue',
          width: 2,
        },
      }
      setLines([newLine])
      console.log('Lines state updated:', lines)
    } else {
      setLines([])
    }
  }, [focusPoints, x, y]) // Logs the updated state whenever focusPoints changes

  const handleClick = (event: any) => {
    if (!focusEnabled) return
    if (!event?.points?.length) return
    const pointIndex = event.points[0].pointIndex
    console.log('Clicked point index:', pointIndex)
    setFocusPoints((prev) => {
      if (prev.includes(pointIndex)) {
        return prev.filter((i) => i !== pointIndex)
      } else {
        return [...prev, pointIndex]
      }
    })
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
        shapes: lines, // Add lines to the plot
      }}
      config={{
        editable: true,
        displayModeBar: true,
        modeBarButtonsToAdd: [player_focus_button,'drawline', 'drawrect', 'eraseshape' as any],
        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d' as any],
      }}
      onClick={handleClick}
    />
  )
}

export default PlotComponent