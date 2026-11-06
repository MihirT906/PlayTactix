import { describe, expect, it } from 'vitest'
import AnnotationStore from './AnnotationStore-optimized'
import { arrangeAfterMove, setOverlayRange, setSegmentRange, splitOverlayAt, splitSegmentAt } from './clipManager'
import type { Clip } from '../types/ClipInterfaces'

const clip: Clip = {
  length: 300,
  matchSegments: [
    { matchId: 1, clipStart: 0, clipEnd: 100, sourceFrameStart: 1000, sourceFrameEnd: 1100 },
    { matchId: 1, clipStart: 100, clipEnd: 300, sourceFrameStart: 5000, sourceFrameEnd: 5200 },
  ],
  overlaySegments: [{ type: 'pitch', clipStart: 0, clipEnd: 300 }],
}

describe('splitSegmentAt', () => {
  it('cuts the segment and its source footage at the same point, keeping the order', () => {
    const split = splitSegmentAt(clip, 1, 150)
    expect(split.matchSegments).toEqual([
      clip.matchSegments[0],
      { matchId: 1, clipStart: 100, clipEnd: 150, sourceFrameStart: 5000, sourceFrameEnd: 5050 },
      { matchId: 1, clipStart: 150, clipEnd: 300, sourceFrameStart: 5050, sourceFrameEnd: 5200 },
    ])
    expect(split.length).toBe(300)
  })

  it('leaves the clip alone when the frame is not inside the segment', () => {
    expect(splitSegmentAt(clip, 0, 0)).toBe(clip)
    expect(splitSegmentAt(clip, 0, 100)).toBe(clip)
    expect(splitSegmentAt(clip, 0, 150)).toBe(clip)
  })
})

describe('splitOverlayAt', () => {
  it('ends the first half on the frame before the cut', () => {
    expect(splitOverlayAt(clip, 0, 120).overlaySegments).toEqual([
      { type: 'pitch', clipStart: 0, clipEnd: 119 },
      { type: 'pitch', clipStart: 120, clipEnd: 300 },
    ])
  })

  it('leaves the clip alone when the frame is not inside the overlay', () => {
    expect(splitOverlayAt(clip, 0, 300)).toBe(clip)
  })
})

describe('AnnotationStore.splitAnnotation', () => {
  it('ends the annotation at the cut and continues an open-ended copy from it', () => {
    const store = new AnnotationStore()
    store.addArrowAnnotation(0, 0, 10, 10, 20)
    const [original] = store.getAllAnnotations()

    store.splitAnnotation(original.key, 50, 50)

    const [first, second] = store.getAllAnnotations()
    expect(first).toMatchObject({ key: original.key, frameStart: 20, frameEnd: 50 })
    expect(second).toMatchObject({ type: 'arrow', frameStart: 50, frameEnd: null, shape: original.shape })
    expect(second.key).not.toBe(original.key)
    expect(second.shape).not.toBe(first.shape)
    expect(store.getArrowAnnotations(50).map((arrow) => arrow.key)).toEqual([second.key])
  })

  it('does nothing when the frame is not inside the annotation', () => {
    const store = new AnnotationStore()
    store.addArrowAnnotation(0, 0, 10, 10, 20)
    const [original] = store.getAllAnnotations()
    store.updateAnnotationRange(original.key, 20, 40, 20)

    store.splitAnnotation(original.key, 20, 20)
    store.splitAnnotation(original.key, 40, 20)

    expect(store.getAllAnnotations()).toHaveLength(1)
  })
})

describe('arrangeAfterMove', () => {
  const spans = [
    { start: 0, end: 100 },
    { start: 100, end: 300 },
    { start: 350, end: 400 },
  ]

  it('trades places with the bars it passes, keeping their gaps and footprint', () => {
    // The first bar dropped past the second's centre but not the third's.
    expect(arrangeAfterMove(spans, 0, 220, 0)).toEqual([
      { from: 1, start: 0, end: 200 },
      { from: 0, start: 200, end: 300 },
      { from: 2, start: 350, end: 400 },
    ])
    // The last bar dropped at the very start passes both; the gap that was second stays second.
    expect(arrangeAfterMove(spans, 2, 0, 0)).toEqual([
      { from: 2, start: 0, end: 50 },
      { from: 0, start: 50, end: 150 },
      { from: 1, start: 200, end: 400 },
    ])
  })

  it('lets a long bar pass a short one at the start of the row', () => {
    // 17s from 0, then 98s from 21s (10 frames a second): the long one's centre can't get past the short one's.
    const pair = [
      { start: 0, end: 170 },
      { start: 210, end: 1190 },
    ]
    expect(arrangeAfterMove(pair, 1, 0, 0)).toEqual([
      { from: 1, start: 0, end: 980 },
      { from: 0, start: 1020, end: 1190 },
    ])
  })

  it('stays between its neighbours when it passes none', () => {
    expect(arrangeAfterMove(spans, 2, 290, 0)).toContainEqual({ from: 2, start: 300, end: 350 })
    expect(arrangeAfterMove(spans, 2, 360, 0)).toContainEqual({ from: 2, start: 360, end: 410 })
  })
})

describe('moving past a neighbour', () => {
  it('reorders match segments, keeping their footage and the array in time order', () => {
    const moved = setSegmentRange(clip, 0, 250, 350, 'move')
    expect(moved.matchSegments).toEqual([
      { ...clip.matchSegments[1], clipStart: 0, clipEnd: 200 },
      { ...clip.matchSegments[0], clipStart: 200, clipEnd: 300 },
    ])
    expect(moved.length).toBe(300)
  })

  it('reorders overlays of one type, a frame apart, leaving other types alone', () => {
    const withOverlays: Clip = {
      ...clip,
      overlaySegments: [
        { type: 'voronoi', clipStart: 0, clipEnd: 49 },
        { type: 'pitch', clipStart: 0, clipEnd: 300 },
        { type: 'voronoi', clipStart: 100, clipEnd: 199 },
      ],
    }
    expect(setOverlayRange(withOverlays, 0, 180, 229, 'move').overlaySegments).toEqual([
      { type: 'voronoi', clipStart: 150, clipEnd: 199 },
      { type: 'pitch', clipStart: 0, clipEnd: 300 },
      { type: 'voronoi', clipStart: 0, clipEnd: 99 },
    ])
  })
})
