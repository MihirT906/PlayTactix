import { CHUNK_SIZE } from "../config"

export interface FrameData {
  period: number
  players: {
    x: Array<number>
    y: Array<number>
    player_id: Array<number>
    id: Array<number>
    short_name: Array<string>
    number: Array<number>
    team_id: Array<number>
    total_time: Array<number>
    player_role_name: Array<string>
    player_role_acronym: Array<string>
    is_gk: Array<boolean>
    direction_player_1st_half: Array<string>
    direction_player_2nd_half: Array<string>
  }
  ball: {
    ball_x: number
    ball_y: number
    ball_z: number
  }
}


export default class DataManager {
  // private cache: Map<number, { frame_num: number; player_id: number, x: number; y: number }[]> = new Map()
  // private cacheLimit = 20 // Maximum number of frames to cache
  private buffer: Map<number, FrameData> = new Map()
  private bufferLimit = 100
  private metaData: any = null

  constructor() {
    console.log('DataManager initialized with empty buffer')
  }

  async fetchChunk(start: number, end: number): Promise<void> {
    console.log('fetchChunk called with range:', start, end)
    if (this.isChunkCached(start, end)) return // uncomment this and fix caching
    console.log('Chunk not cached, fetching from server...')
    try {
      const response = await fetch(`http://localhost:8000/data/frames?start=${start}&end=${end}`)
      const data = await response.json()
      Object.entries(data).forEach(([frame, frameData]) => {
        this.buffer.set(Number(frame), frameData as FrameData)
      })
      
      // Evict old chunks if cache exceeds the limit
      this.evictOldChunks()
      console.log('this.buffer:', this.buffer)
    } catch (error) {
      console.error('Error fetching chunk data:', error)
    }
  }

  async fetchMatchMetaData(){
    try {
      const response = await fetch(`http://localhost:8000/data/match_meta`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching match metadata:', error)
    }
    return null
  }

  async getFrameData(frame: number) {
    console.log(`getFrameData called for frame: ${frame}`);
    if (this.buffer.has(frame)) {
      console.log(`Frame ${frame} found in buffer`);
      return this.buffer.get(frame)!;
    } else {
      const start = Math.floor((frame - 1) / CHUNK_SIZE) * CHUNK_SIZE + 1;
      const end = start + CHUNK_SIZE - 1;

      let retries = 0;
      while (retries < 3) {
        try {
          await this.fetchChunk(start, end);
          if (this.buffer.has(frame)) {
            console.log(`Frame ${frame} successfully fetched after ${retries + 1} attempt(s)`);
            return this.buffer.get(frame)!;
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed to fetch chunk:`, error);
        }
        retries++;
      }

      console.warn(`Frame ${frame} not found in buffer after 3 retries`);
      return null;
    }
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