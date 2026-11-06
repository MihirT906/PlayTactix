import { describe, expect, it } from 'vitest'
import AnnotationStore from './AnnotationStore-optimized'
import { splitOverlayAt, splitSegmentAt } from './clipManager'
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
