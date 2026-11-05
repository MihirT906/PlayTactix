// The colour bands on the playback slider. Shared with the docs, whose legend shows the same colours.
export const SLIDER_COLORS = {
  played: 'red',
  loaded: 'darkgray',
  loading: 'lightgray',
  // Far darker than the greys either side of it, so a gap in the data never reads as loaded or loading.
  missing: 'black',
} as const
