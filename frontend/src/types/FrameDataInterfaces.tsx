
interface FrameData {
    period: number | null;
    players: Players;
    ball: Ball;
    events: Event[] | [];

}

interface Ball {
    ball_x: number | null;
    ball_y: number | null;
    ball_z: number | null;
}

interface Players {
    x: number[] | [];
    y: number[] | [];
    player_id: number[] | [];
    id: number[] | [];
    short_name: string[] | [];
    number: number[] | [];
    team_id: number[] | [];
    total_time: number[] | [];
    player_role_name: string[] | [];
    player_role_acronym: string[] | [];
    is_gk: boolean[] | [];
    direction_player_1st_half: string[] | [];
    direction_player_2nd_half: string[] | [];
}

interface Event {
    event_id: string;
    index: number;
    frame_start: number;
    frame_end: number;
    attacking_side: string;
    event_type_id: number;
    event_type: string;
    event_subtype_id: number;
    event_subtype: string;
    player_id: number;
    player_name: string;
    player_position: string;
    player_in_possession_id: number;
    team_id: number;
    x_start: number;
    y_start: number;
    x_end: number;
    y_end: number;
    lead_to_shot: boolean;
    lead_to_goal: boolean;
    distance_covered: number;
    speed_avg: number;
    separation_gain: number;
    pass_distance_received: number;
    player_targeted_xpass_completion: number;
    player_targeted_xthreat: number;
    xthreat: number;
    xpass_completion: number;
    n_opponents_overtaken: number;
    xloss_player_possession_max: number;
    xshot_player_possession_max: number;
}

export type { FrameData, Event, Players, Ball }