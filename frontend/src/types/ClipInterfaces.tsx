// A Clip is the thing the user is building: its own timeline (starting at frame 0),
// built from one or more Segments of match data placed onto it.
export type Segment = {
  matchId: number | null
  clipStart: number
  clipEnd: number
  sourceFrameStart: number
  sourceFrameEnd: number
}

export type BackgroundKind = 'pitch'

// An overlay (e.g. the pitch background) placed over a range of the clip's own timeline.
export type OverlaySegment = {
  type: BackgroundKind
  clipStart: number
  clipEnd: number
}

export type Clip = {
  length: number
  matchSegments: Segment[]
  overlaySegments: OverlaySegment[]
}

export type ResolvedClipFrame = {
  matchId: number | null
  sourceFrame: number
}
