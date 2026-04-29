
interface MatchData {
  id: number;
  home_team_score: number;
  away_team_score: number;
  date_time: string;

  stadium: {
    id: number;
    name: string;
    city: string;
    capacity: number;
  };

  home_team: Team;
  away_team: Team;

  home_team_kit: TeamKit;
  away_team_kit: TeamKit;

  home_team_coach: any | null;
  away_team_coach: any | null;

  home_team_playing_time: PlayingTimeSummary;
  away_team_playing_time: PlayingTimeSummary;

  competition_edition: {
    id: number;
    competition: {
      id: number;
      area: string;
      name: string;
      gender: string;
      age_group: string;
    };
    season: Season;
    name: string;
  };

  match_periods: MatchPeriod[];

  competition_round: {
    id: number;
    name: string;
    round_number: number;
    potential_overtime: boolean;
  };

  referees: any[];

  players: Player[];

  status: string;

  home_team_side: string[];

  ball: {
    trackable_object: number;
  };

  pitch_length: number;
  pitch_width: number;
}

/* ---------- Reusable Types ---------- */

interface Team {
  id: number;
  name: string;
  short_name: string;
  acronym: string;
}

interface Season {
  id: number;
  start_year: number;
  end_year: number;
  name: string;
}

interface TeamKit {
  id: number;
  team_id: number;
  season: Season;
  name: string;
  jersey_color: string;
  number_color: string;
}

interface PlayingTimeSummary {
  minutes_tip: number;
  minutes_otip: number;
}

interface MatchPeriod {
  period: number;
  name: string;
  start_frame: number;
  end_frame: number;
  duration_frames: number;
  duration_minutes: number;
}

/* ---------- Player ---------- */

interface Player {
  id: number;
  team_id: number;

  first_name: string;
  last_name: string;
  short_name: string;
  birthday: string | null;
  gender: string;

  number: number;

  player_role: {
    id: number;
    position_group: string;
    name: string;
    acronym: string;
  };

  start_time: string | null;
  end_time: string | null;

  yellow_card: number;
  red_card: number;
  goal: number;
  own_goal: number;
  injured: boolean;

  trackable_object: number;
  team_player_id: number;

  playing_time: {
    total: PlayingTimeTotal | null;
    by_period: PlayingTimeByPeriod[];
  };
}

interface PlayingTimeTotal {
  minutes_tip: number;
  minutes_otip: number;
  start_frame: number;
  end_frame: number;
  minutes_played: number;
  minutes_played_regular_time: number;
}

interface PlayingTimeByPeriod {
  name: string;
  minutes_tip: number;
  minutes_otip: number;
  start_frame: number;
  end_frame: number;
  minutes_played: number;
}

export type { MatchData, Team, Season, TeamKit, PlayingTimeSummary, MatchPeriod, Player, PlayingTimeTotal, PlayingTimeByPeriod }