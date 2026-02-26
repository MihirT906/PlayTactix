import React, { useState, useMemo } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'

interface PlotComponentProps {
  x: number[]
  y: number[]
}

const PlotComponent: React.FC<PlotComponentProps> = ({ x, y }) => {
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]) 
  const [selectionEnabled, setSelectionEnabled] = useState(false)
  const customButton = useMemo(() => ({
    name: 'Highlight Player',
    icon: Plotly.Icons.tooltip_basic, //spikeline, ;;;;bullseye, certificate, chart-line, circle-nodes, dice-d20, people-arrows, 
    click: () => {
        setSelectionEnabled(prev => !prev)
      },
  }), [])
  const handleClick = (event: any) => {
    if (!selectionEnabled) return
    if (!event?.points?.length) return
    const pointIndex = event.points[0].pointIndex
    //console.log('Clicked point index:', pointIndex)
    setSelectedPoints((prev) => {
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
          marker: { size: 10 },
          selectedpoints: selectedPoints,
          selected: {
            marker: { opacity: 1 }
          },
          unselected: {
            marker: { opacity: 0.7 }
          }
        },
      ]}
      layout={{
        title: { text: 'Scatter Plot' }, // Updated to use an object
        xaxis: { title: { text: 'X Axis' } }, // Updated to use an object
        yaxis: { title: { text: 'Y Axis' } }, // Updated to use an object
        autosize: true,
      }}
      config={{
        editable: false,
        displayModeBar: true,
        modeBarButtonsToAdd: [customButton,'drawline', 'drawrect', 'eraseshape' as any],
        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d' as any],
      }}
      onClick={handleClick}
    />
  )
}

export default PlotComponent