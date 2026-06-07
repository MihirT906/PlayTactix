interface KeyMomentsData {
    goals: Goal[],
    shots: Shot[],
    pops: PhasesOfPlay[]
}
interface PhasesOfPlay {
    phase_index: number,
    frame_start: number,
    frame_end: number,
    time_end: string,
    team_id: number,
    team_in_possession_phase_type: string,
    team_out_of_possession_phase_type: string,
}

interface Goal {
    Sequence_ID: number,
    frame_start: number,
    frame_end: number,
    lead_to_goal: boolean,
    player_name: string,
    time_end: string
}

interface Shot {
    Sequence_ID: number,
    frame_start: number,
    frame_end: number,
    lead_to_shot: boolean,
    player_name: string,
    time_end: string
}

export type { KeyMomentsData }