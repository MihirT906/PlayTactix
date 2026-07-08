
interface FrameData {
    period: number | null;
    players: Players;
    ball: Ball;
    events: Event[] | [];
    overlays: {
        pitch_control: {
            type: string;
            data: number[][]; // 2D array representing pitch control values
        } | null;
    };
    }

interface Ball {
    ball_x: number | null;
    ball_y: number | null;
    ball_z: number | null;
}

interface Players {
    x: number[];
    y: number[];
    player_id: number[];
    team: string[];
    vx: (number | null)[];
    vy: (number | null)[];
    speed: (number | null)[];
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
    start_type: string;
    end_type: string;
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
    xloss_player_possession_start: number;
    xloss_player_possession_end: number;
    xloss_player_possession_max: number;
    xshot_player_possession_start: number;
    xshot_player_possession_end: number;
    xshot_player_possession_max: number;
}

export type { FrameData, Event, Players, Ball }