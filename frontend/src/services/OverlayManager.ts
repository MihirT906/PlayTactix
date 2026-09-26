import type { FrameData } from '../types/FrameDataInterfaces'

export type OverlayPayload =
  | { kind: 'pass_option_prob'; data: FrameData | null }
  | { kind: 'pitch_control'; data: number[][] | null }

export type OverlayRequestResult = {
  payload: OverlayPayload | null
}

export default class OverlayManager {
  // No-op today: getOverlayForFrame is handed frameData directly and doesn't
  // need the match id. Kept for interface parity with DataManager.setMatchId,
  // which does use it, since both are called together (MatchSessionContext).
  setMatchId(_matchId: number | null): void {}

  async getOverlayForFrame(
    overlay: OverlayPayload['kind'] | null,
    _frame: number,
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