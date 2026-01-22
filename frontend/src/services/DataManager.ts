export default class DataManager {
  private cache: Map<number, { frame_num: number; x: number; y: number }[]> = new Map()

  async fetchChunk(start: number, end: number): Promise<void> {
    if (this.isChunkCached(start, end)) return

    try {
      const response = await fetch(`http://localhost:8000/data/frames?start=${start}&end=${end}`)
      const data = await response.json()
      data.forEach((point: { frame_num: number; x: number; y: number }) => {
        if (!this.cache.has(point.frame_num)) {
          this.cache.set(point.frame_num, [])
        }
        this.cache.get(point.frame_num)?.push(point)
      })
    } catch (error) {
      console.error('Error fetching chunk data:', error)
    }
  }

  getFrameData(frame: number): { frame_num: number; x: number; y: number }[] {
    return this.cache.get(frame) || []
  }

  private isChunkCached(start: number, end: number): boolean {
    for (let i = start; i <= end; i++) {
      if (!this.cache.has(i)) return false
    }
    return true
  }
}