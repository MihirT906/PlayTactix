import { BUFFER_MINUTES, CHUNK_SIZE, API_BASE_URL } from "../config"
import type { FrameData } from '../types/FrameDataInterfaces'
import { getLogger } from "./logger";

const logger = getLogger("DataManager");

type FrameRequestResult = {
  frameData: FrameData | null
}

export type FrameRange = { start: number; end: number }

// Frames are fetched in fixed, aligned chunks: frame f belongs to chunk floor(f / CHUNK_SIZE), so a frame
// is only ever requested as part of the same chunk and two requests never overlap.
const chunkIndexOf = (frame: number) => Math.floor(frame / CHUNK_SIZE)
const chunkBounds = (index: number): FrameRange => ({ start: index * CHUNK_SIZE, end: (index + 1) * CHUNK_SIZE - 1 })
// How long the prefetch leaves a chunk alone after fetching it failed. Without it every frame past the
// middle of a chunk would ask again while the backend is down.
const PREFETCH_RETRY_MS = 5000
const FRAME_RATE = 10 // Tracking frames per second
// At least two chunks, the one playing and the one prefetched after it, or loading the next would evict
// the current one.
const BUFFER_LIMIT = Math.max(BUFFER_MINUTES * 60 * FRAME_RATE, 2 * CHUNK_SIZE)

export default class DataManager {
  private buffer: Map<number, FrameData> = new Map()
  private bufferLimit = BUFFER_LIMIT
  private missingFrames: Set<number> = new Set() // Track missing frames to avoid repeated fetch attempts
  private selectedMatchId: number | null = null
  // Loaded chunk indices, least recently used first, so eviction drops whole chunks.
  private loadedChunks: Set<number> = new Set()
  // Chunks being fetched, so the playhead and the prefetch share one request.
  private pendingChunks: Map<number, Promise<void>> = new Map()
  // When each chunk last failed to load, so the prefetch backs off.
  private failedChunks: Map<number, number> = new Map()
  private loadedRangesListener: ((ranges: FrameRange[]) => void) | null = null

  setMatchId(matchId: number): void {
    if (this.selectedMatchId === matchId) {
      return
    }

    logger.info("Switching match selectedMatchId=%s newMatchId=%s", this.selectedMatchId, matchId)
    this.selectedMatchId = matchId
    this.buffer.clear()
    this.missingFrames.clear()
    this.loadedChunks.clear()
    this.pendingChunks.clear()
    this.failedChunks.clear()
    logger.info("Buffer and missing frames cleared for match_id=%s", matchId)
  }

  getMatchId(): number | null {
    return this.selectedMatchId
  }

  // Called with the loaded frame ranges each time a chunk lands, whether the playhead or the prefetch
  // asked for it. Eviction happens in the same step, so the ranges are always what is in memory.
  setLoadedRangesListener(listener: ((ranges: FrameRange[]) => void) | null): void {
    this.loadedRangesListener = listener
  }

  // The loaded chunks as contiguous frame ranges, in frame order.
  getLoadedRanges(): FrameRange[] {
    const ranges: FrameRange[] = []
    for (const index of [...this.loadedChunks].sort((a, b) => a - b)) {
      const { start, end } = chunkBounds(index)
      const last = ranges[ranges.length - 1]
      if (last && last.end + 1 === start) last.end = end
      else ranges.push({ start, end })
    }
    return ranges
  }

  private loadChunk(index: number): Promise<void> {
    if (this.loadedChunks.has(index)) return Promise.resolve()
    const pending = this.pendingChunks.get(index)
    if (pending) return pending

    const matchId = this.selectedMatchId
    if (matchId === null) {
      return Promise.reject(new Error('Cannot fetch frame data before selecting a match'))
    }

    const request = this.fetchChunk(index, matchId).finally(() => {
      if (this.pendingChunks.get(index) === request) this.pendingChunks.delete(index)
    })
    this.pendingChunks.set(index, request)
    return request
  }

  private async fetchChunk(index: number, matchId: number): Promise<void> {
    const { start, end } = chunkBounds(index)
    try {
      const response = await fetch(`${API_BASE_URL}/data/frames?match_id=${matchId}&start=${start}&end=${end}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch frames: ${response.status}`)
      }
      const ret = await response.json()
      // The match changed while this was in flight, so these frames belong to the old one.
      if (this.selectedMatchId !== matchId) return
      if (!ret['frames']) {
        throw new Error(`No frames in response: ${ret['error'] ?? 'unknown error'}`)
      }

      const data = ret['frames']
      const missingFrames = ret['missing_frames']

      Object.entries(data).forEach(([frame, frameData]) => {
        const frameNumber = Number(frame)
        this.buffer.set(frameNumber, frameData as FrameData)
        this.missingFrames.delete(frameNumber)
      })

      missingFrames.forEach((frame: number) => {
        this.missingFrames.add(frame)
      })
      this.loadedChunks.add(index)
      this.failedChunks.delete(index)

      logger.info("Chunk loaded start=%s end=%s cached=%s missing=%s", start, end, Object.keys(data).length, missingFrames.length)
      // Evict old chunks if cache exceeds the limit
      this.evictOldChunks()
      this.loadedRangesListener?.(this.getLoadedRanges())
    } catch (error) {
      if (this.selectedMatchId === matchId) this.failedChunks.set(index, Date.now())
      logger.error('Error fetching chunk data:', error)
    }
  }

  async fetchMatchMetaData() {
    if (this.selectedMatchId === null) {
      return null
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/data/match_meta?match_id=${this.selectedMatchId}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch match metadata: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      logger.error("Failed to fetch match metadata for match_id=%s", this.selectedMatchId, error)
    }

    return null
  }

  async fetchKeyMoments(){
    if (this.selectedMatchId === null) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/data/match_key_moments?match_id=${this.selectedMatchId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch key moments: ${response.status}`)
      }
      const payload = await response.json()
      return payload.data
    } catch (error) {
      logger.error("Failed to fetch key moments for match_id=%s", this.selectedMatchId, error)
    }
    return null
  }

  // The frame under the playhead if it is loaded, without waiting on the network. Marks its chunk as
  // recently used and, past the middle of the chunk, starts fetching the next one so playback runs into
  // frames that are already there.
  getLoadedFrame(frame: number): FrameData | null {
    const frameData = this.buffer.get(frame)
    if (!frameData) return null

    const index = chunkIndexOf(frame)
    if (this.loadedChunks.delete(index)) this.loadedChunks.add(index)
    const failedAt = this.failedChunks.get(index + 1)
    const backingOff = failedAt !== undefined && Date.now() - failedAt < PREFETCH_RETRY_MS
    if (frame - chunkBounds(index).start >= CHUNK_SIZE / 2 && !backingOff) {
      void this.loadChunk(index + 1)
    }
    return frameData
  }

  async getFrameData(frame: number): Promise<FrameRequestResult> {
    logger.debug("getFrameData frame=%s", frame);
    if (this.selectedMatchId === null) {
      return { frameData: null }
    }

    const loaded = this.getLoadedFrame(frame)
    if (loaded) {
      return { frameData: loaded }
    }

    if (this.missingFrames.has(frame)) {
      logger.warn("Frame %s is known to be missing, skipping fetch attempt", frame);
      return { frameData: null }
    }

    let retries = 0;

    while (retries < 3) {
      try {
        await this.loadChunk(chunkIndexOf(frame));

        const fetched = this.getLoadedFrame(frame)
        if (fetched) {
          logger.info("Frame %s fetched after %s attempt(s)", frame, retries + 1);
          return { frameData: fetched }
        }
      } catch (error) {
        logger.warn("Attempt %s/3 failed for frame=%s", retries + 1, frame, error);
      }
      retries++;
    }

    logger.warn("Frame %s not found in buffer after 3 retries", frame);
    return { frameData: null }
  }

  // A frame only if it is already loaded, never fetching it; for overlays that look back over recent frames.
  getBufferedFrame(frame: number): FrameData | undefined {
    return this.buffer.get(frame)
  }

  // Merges known-missing frame numbers within [start, end] into contiguous ranges,
  // for rendering gaps on the timeline. Only reflects frames that have already
  // been fetched — frames not yet requested are simply absent from the result.
  getMissingFrameRanges(start: number, end: number): { start: number; end: number }[] {
    const ranges: { start: number; end: number }[] = []
    let rangeStart: number | null = null

    for (let i = start; i <= end; i++) {
      if (this.missingFrames.has(i)) {
        if (rangeStart === null) rangeStart = i
      } else if (rangeStart !== null) {
        ranges.push({ start: rangeStart, end: i - 1 })
        rangeStart = null
      }
    }
    if (rangeStart !== null) {
      ranges.push({ start: rangeStart, end })
    }

    return ranges
  }

  private evictOldChunks(): void {
    // The chunk just loaded is the most recently used, so it is never the one dropped.
    while (this.buffer.size > this.bufferLimit && this.loadedChunks.size > 1) {
      const oldest = this.loadedChunks.values().next().value!
      this.loadedChunks.delete(oldest)
      const { start, end } = chunkBounds(oldest)
      for (let frame = start; frame <= end; frame++) {
        this.buffer.delete(frame)
      }
    }
  }
}
