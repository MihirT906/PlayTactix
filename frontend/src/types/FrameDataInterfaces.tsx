
interface FrameData {
    period: number | null;
    players: Players;
    ball: {
        ball_x: number | null;
        ball_y: number | null;
        ball_z: number | null;
    }
    events: Event[] | [];

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
    // event_subtype_id: number | null;
    // event_subtype: string | null;
    player_id: number;
    player_name: string;
    team_id: number;
    x_start: number;
    y_start: number;
    x_end: number;
    y_end: number;
}

export type { FrameData }