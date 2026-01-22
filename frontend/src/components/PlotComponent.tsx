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
        title: 'Scatter Plot',
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' },
        autosize: true,
      }}
    />
  )
}

export default PlotComponent