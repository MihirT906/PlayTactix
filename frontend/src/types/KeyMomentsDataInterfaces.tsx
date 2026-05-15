interface KeyMomentsData {
    goals: Goal[],
    shots: Shot[],
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