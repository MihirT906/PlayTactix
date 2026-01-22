interface PlotLayout {
  width: number
  height: number
  title: { text: string }
  xaxis: { title: string; range: [number, number]; fixedrange: boolean }
  yaxis: { title: string; range: [number, number]; fixedrange: boolean }
  shapes: any[]
  dragmode: string
}

interface PlotConfig {
  modeBarButtonsToAdd: string[]
}

class PlotManager {
  private layout: PlotLayout
  private config: PlotConfig
  private shapes: any[]

  constructor() {
    this.shapes = []

    this.layout = {
      width: 800,
      height: 600,
      title: { text: 'Player Positions' },
      xaxis: {
        title: 'X Coordinate',
        range: [0, 100],
        fixedrange: true,
      },
      yaxis: {
        title: 'Y Coordinate',
        range: [0, 100],
        fixedrange: true,
      },
      shapes: this.shapes,
      dragmode: 'drawline',
    }

    this.config = {
      modeBarButtonsToAdd: [
        'drawline',
        'drawopenpath',
        'drawclosedpath',
        'drawcircle',
        'drawrect',
        'eraseshape',
      ],
    }
  }

  getLayout(currentFrame: number): PlotLayout {
    return {
      ...this.layout,
      title: { text: `Player Positions - Frame ${currentFrame}` },
      shapes: this.shapes,
    }
  }

  getConfig(): PlotConfig {
    return this.config
  }

  updateShapes(newShapes: any[]) {
    this.shapes = newShapes
  }

  clearShapes() {
    this.shapes = []
  }
}

export default PlotManager