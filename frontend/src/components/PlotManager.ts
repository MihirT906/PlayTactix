import type { Layout, Config } from 'plotly.js'

class PlotManager {
  private layout: Partial<Layout>
  private config: Partial<Config>
  private shapes: any[]
  private isPlaying: boolean
  private currentFrame: number

  constructor() {
    this.shapes = []
    this.isPlaying = true
    this.currentFrame = 1

    this.layout = {
      width: 800,
      height: 600,
      title: { text: 'Player Positions' },
      xaxis: {
        title: { text: 'X Coordinate' }, // Updated to match Plotly's expected type
        range: [0, 100],
        fixedrange: true,
      },
      yaxis: {
        title: { text: 'Y Coordinate' }, // Updated to match Plotly's expected type
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
      ] as any[], // Cast to `any[]` to satisfy the expected type
    }
  }

  getLayout(): Partial<Layout> {
    return {
      ...this.layout,
      title: { text: `Player Positions - Frame ${this.currentFrame}` },
      shapes: this.shapes,
    }
  }

  getConfig(): Partial<Config> {
    return this.config
  }

  getCurrentFrame(): number {
    return this.currentFrame
  }

  setCurrentFrame(frame: number) {
    this.currentFrame = frame
  }

  isAnimationPlaying(): boolean {
    return this.isPlaying
  }

  toggleAnimation() {
    this.isPlaying = !this.isPlaying
  }

  updateShapes(newShapes: any[]) {
    this.shapes = newShapes
  }

  clearShapes() {
    this.shapes = []
  }
}

export default PlotManager