
interface FrameData {
    period: number;
    players: {
        x: number[];
        y: number[];
        player_id: number[];
        id: number[];
        short_name: string[];
        number: number[];
        team_id: number[];
        total_time: number[];
        player_role_name: string[];
        player_role_acronym: string[];
        is_gk: boolean[];
        direction_player_1st_half: string[];
        direction_player_2nd_half: string[];
    };
    ball: {
        ball_x: number;
        ball_y: number;
        ball_z: number;
    }
}

export type { FrameData }