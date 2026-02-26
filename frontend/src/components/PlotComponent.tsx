import Plot from 'react-plotly.js'

interface PlotComponentProps {
  x: number[]
  y: number[]
}

const PlotComponent: React.FC<PlotComponentProps> = ({ x, y }) => {
  return (
    <Plot
      data={[
        {
          x: x,
          y: y,
          mode: 'markers',
          type: 'scatter',
          marker: { size: 10 },
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
        modeBarButtonsToAdd: ['drawline', 'drawrect', 'eraseshape' as any],
        modeBarButtonsToRemove: ['zoom', 'pan', 'select', 'lasso', 'zoomin', 'zoomout', 'autoScale2d'],
      }}
    />
  )
}

export default PlotComponent