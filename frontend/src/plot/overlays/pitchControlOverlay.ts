import type { FrameData, Players, Ball } from '../../types/FrameDataInterfaces'



export async function buildPitchControlOverlay(frameData: FrameData | null, currentFrame: number, config: {}) {
  if (!frameData) {
    return null
  }

  try {
    let match_id = 1886347
    let start = 10
    let end = 200
    const response = await fetch(`http://localhost:8000/data/pitch_control_overlay?match_id=${match_id}&start=${start}&end=${end}`)
    const ret = await response.json()
    const pitch_control = ret[currentFrame.toString()]
    console.log('Received pitch control data:', pitch_control)
    // const x = [-56.5, -28.25, 0, 28.25, 56.5]
    // const y = [-38, -19, 0, 19, 38]

    // // z[row][col] => y first, then x
    // const z = [
    //   [0.1, 0.2, 0.4, 0.7, 0.9],
    //   [0.1, 0.3, 0.5, 0.7, 0.8],
    //   [0.2, 0.4, 0.5, 0.6, 0.8],
    //   [0.2, 0.3, 0.4, 0.6, 0.7],
    //   [0.1, 0.2, 0.3, 0.5, 0.6],
    // ]
    // return [
    //   {
    //     type: 'contour',
    //     x,
    //     y,
    //     z,
    //     hoverinfo: 'skip',
    //     showscale: false,
    //     opacity: 0.5,
    //     contours: {
    //       coloring: 'heatmap', // use 'lines' if you only want contour lines
    //       showlines: false,
    //     },
    //     colorscale: [
    //       [0, '#2563EB'],
    //       [0.5, '#FFFFFF'],
    //       [1, '#DC2626'],
    //     ],
    //   },
    // ]
    const rows = pitch_control.length
    const cols = pitch_control[0]?.length ?? 0

    return [{
      type: 'contour',
      z: pitch_control,
      x0: -53,
      dx: 106 / (cols - 1),
      y0: -34,
      dy: 68 / (rows - 1),
      hoverinfo: 'skip',
      showscale: false,
      opacity: 0.5,
      contours: {
        coloring: 'heatmap',
        showlines: false,
      },
      colorscale: [
        [0, '#2563EB'],
        [0.5, '#FFFFFF'],
        [1, '#DC2626'],
      ],
    }]
  } catch (error) {
    console.error('Error fetching pitch control overlay:', error)
    return null
  }





  // const x = [-56.5, -28.25, 0, 28.25, 56.5]
  // const y = [-38, -19, 0, 19, 38]

  // // z[row][col] => y first, then x
  // const z = [
  //   [0.1, 0.2, 0.4, 0.7, 0.9],
  //   [0.1, 0.3, 0.5, 0.7, 0.8],
  //   [0.2, 0.4, 0.5, 0.6, 0.8],
  //   [0.2, 0.3, 0.4, 0.6, 0.7],
  //   [0.1, 0.2, 0.3, 0.5, 0.6],
  // ]

  // return [
  //   {
  //     type: 'contour',
  //     x,
  //     y,
  //     z,
  //     hoverinfo: 'skip',
  //     showscale: false,
  //     opacity: 0.5,
  //     contours: {
  //       coloring: 'heatmap', // use 'lines' if you only want contour lines
  //       showlines: false,
  //     },
  //     colorscale: [
  //       [0, '#2563EB'],
  //       [0.5, '#FFFFFF'],
  //       [1, '#DC2626'],
  //     ],
  //   },
  // ]
}