import { CHUNK_SIZE } from "../config"
import type { FrameData, Event } from '../types/FrameDataInterfaces'
import { getLogger } from "./logger";

const logger = getLogger("DataManager");

type FrameRequestResult = {
  frameData: FrameData | null
  didLoadChunk: boolean
  newChunkRange: { start: number; end: number } | null
}

export default class DataManager {
  private buffer: Map<number, FrameData> = new Map()
  private bufferLimit = 5000
  private missingFrames: Set<number> = new Set() // Track missing frames to avoid repeated fetch attempts
  private selectedMatchId: number | null = null

  setMatchId(matchId: number): void {
    if (this.selectedMatchId === matchId) {
      return
    }

    logger.info("Switching match selectedMatchId=%s newMatchId=%s", this.selectedMatchId, matchId)
    this.selectedMatchId = matchId
    this.buffer.clear()
    this.missingFrames.clear()
    logger.info("Buffer and missing frames cleared for match_id=%s", matchId)
  }

  getMatchId(): number | null {
    return this.selectedMatchId
  }

  async fetchChunk(start: number, end: number): Promise<void> {
    if (this.isChunkCached(start, end)) return // uncomment this and fix caching
    if (this.selectedMatchId === null) {
      throw new Error('Cannot fetch frame data before selecting a match')
    }

    try {
      const response = await fetch(`http://localhost:8000/data/frames?match_id=${this.selectedMatchId}&start=${start}&end=${end}`)
      const ret = await response.json()
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
      
      logger.info("Chunk loaded start=%s end=%s cached=%s missing=%s", start, end, Object.keys(data).length, missingFrames.length)
      // Evict old chunks if cache exceeds the limit
      this.evictOldChunks()
    } catch (error) {
      logger.error('Error fetching chunk data:', error)
    }
  }

  async fetchMatchMetaData() {
    if (this.selectedMatchId === null) {
      return null
    }

    try {
      const response = await fetch(
        `http://localhost:8000/data/match_meta?match_id=${this.selectedMatchId}`
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
      const response = await fetch(`http://localhost:8000/data/match_key_moments?match_id=${this.selectedMatchId}`)
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

  async getFrameData(frame: number): Promise<FrameRequestResult> {
    logger.debug("getFrameData frame=%s", frame);
    if (this.selectedMatchId === null) {
      return {
        frameData: null,
        didLoadChunk: false,
        newChunkRange: null,
      }
    }
    
    if (this.buffer.has(frame)) {
      return { 
        frameData: this.buffer.get(frame)!, 
        didLoadChunk: false, 
        newChunkRange: null
      };
    }

    if (this.missingFrames.has(frame)) {
      logger.warn("Frame %s is known to be missing, skipping fetch attempt", frame);
      return {
        frameData: null,
        didLoadChunk: false,
        newChunkRange: null
      };
    }

    const start = frame;
    const end = start + CHUNK_SIZE;
    let retries = 0;
    
    while (retries < 3) {
      try {
        await this.fetchChunk(start, end);
          
        if (this.buffer.has(frame)) {
          logger.info("Frame %s fetched after %s attempt(s)", frame, retries + 1);
          return { 
            frameData: this.buffer.get(frame)!, 
            didLoadChunk: true, 
            newChunkRange: {start, end}
          };
        }
      } catch (error) {
        logger.warn("Attempt %s/3 failed for frame=%s", retries + 1, frame, error);
      }
      retries++;
    } 

    logger.warn("Frame %s not found in buffer after 3 retries", frame);
    return {
      frameData: null,
      didLoadChunk: false,
      newChunkRange: null
    };
  }

  getEventData(start: number, end: number): Map<number, Event[]> {
    const eventData = new Map<number, Event[]>()
    let missingCount = 0
    for (let i = start; i <= end; i++) {
        if (this.buffer.has(i)) {
            eventData.set(i, this.buffer.get(i)?.events!)
        } else {
            missingCount++
        }
    }
    if (missingCount > 0) {
        logger.warn("Event data missing %s of %s frames in range=%s-%s", missingCount, end - start + 1, start, end)
    }
    return eventData
  }

  private isChunkCached(start: number, end: number): boolean {
      for (let i = start; i <= end; i++) {
          if (!this.buffer.has(i)) {
              return false;
          }
      }
      return true;
  }

  private evictOldChunks(): void {
    while (this.buffer.size > this.bufferLimit) {
      const oldestKey = this.buffer.keys().next().value
      if (oldestKey !== undefined) {
        this.buffer.delete(oldestKey)
      }
    }
  }
}