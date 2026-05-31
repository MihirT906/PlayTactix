import type { FrameData } from '../types/FrameDataInterfaces'
import type { OverlayKind } from '../context/MatchSessionContext'

export type OverlayPayload =
  | { kind: 'pass_option_prob'; data: FrameData | null }
  | { kind: 'pitch_control'; data: number[][] | null }

export type OverlayRequestResult = {
  payload: OverlayPayload | null
}

export default class OverlayManager {
  private selectedMatchId: number | null = null

  setMatchId(matchId: number | null): void {
    this.selectedMatchId = matchId
  }

  async getOverlayForFrame(
    overlay: OverlayKind | null,
    frame: number,
    frameData: FrameData | null
  ): Promise<OverlayRequestResult> {
    if (!overlay) {
      return {
        payload: null,
      }
    }

    if (overlay === 'pass_option_prob') {
      return {
        payload: {
          kind: 'pass_option_prob',
          data: frameData,
        },
      }
    }

    if (overlay === 'pitch_control') {
      // delegate to pitch-control-specific cache/fetch logic
    }

    return {
      payload: null,
    }
  }
}