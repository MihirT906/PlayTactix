import { CHUNK_SIZE } from "../config"
import type { FrameData, Event } from '../types/FrameDataInterfaces'

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

  constructor() {
    console.log('DataManager initialized with empty buffer')
  }

  setMatchId(matchId: number): void {
    if (this.selectedMatchId === matchId) {
      return
    }

    this.selectedMatchId = matchId
    this.buffer.clear()
    this.missingFrames.clear()
  }

  getMatchId(): number | null {
    return this.selectedMatchId
  }

  async fetchChunk(start: number, end: number): Promise<void> {
    console.log('fetchChunk called with range:', start, end)
    if (this.isChunkCached(start, end)) return // uncomment this and fix caching
    if (this.selectedMatchId === null) {
      throw new Error('Cannot fetch frame data before selecting a match')
    }
    // console.log('Chunk not cached, fetching from server...')
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
      
      // Evict old chunks if cache exceeds the limit
      this.evictOldChunks()
    } catch (error) {
      console.error('Error fetching chunk data:', error)
    }
  }

  async fetchMatchMetaData(){
    if (this.selectedMatchId === null) {
      return null
    }

    try {
      const response = await fetch(`http://localhost:8000/data/match_meta?match_id=${this.selectedMatchId}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching match metadata:', error)
    }
    return null
  }

  async fetchKeyMoments(){
    if (this.selectedMatchId === null) {
      return null
    }

    try {
      const response = await fetch(`http://localhost:8000/data/match_key_moments?match_id=${this.selectedMatchId}`)
      const payload = await response.json()
      return payload.data
    } catch (error) {
      console.error('Error fetching key moments:', error)
    }
    return null
  }

  async getFrameData(frame: number): Promise<FrameRequestResult> {
    console.log(`getFrameData called for frame: ${frame}`);
    if (this.selectedMatchId === null) {
      return {
        frameData: null,
        didLoadChunk: false,
        newChunkRange: null,
      }
    }
    
    if (this.buffer.has(frame)) {
      console.log(`Frame ${frame} found in buffer`);
      return { 
        frameData: this.buffer.get(frame)!, 
        didLoadChunk: false, 
        newChunkRange: null
      };
    }

    if (this.missingFrames.has(frame)) {
      console.warn(`Frame ${frame} is known to be missing, skipping fetch attempt`);
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
          console.log(`Frame ${frame} successfully fetched after ${retries + 1} attempt(s)`);
          return { 
            frameData: this.buffer.get(frame)!, 
            didLoadChunk: true, 
            newChunkRange: {start, end}
          };
        }
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed to fetch chunk:`, error);
      }
      retries++;
    } 

    console.warn(`Frame ${frame} not found in buffer after 3 retries`);
    return {
      frameData: null,
      didLoadChunk: false,
      newChunkRange: null
    };
  }

  getEventData(start: number, end: number): Map<number, Event[]> {
    // get chunk data from buffer, if not present return error message
    const eventData = new Map<number, Event[]>()
    for (let i = start; i <= end; i++) {
      if (this.buffer.has(i)) {
        eventData.set(i, this.buffer.get(i)?.events!)
      } else {
        console.warn(`Frame ${i} not found in buffer`)
      }
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