import { useEffect, useState } from 'react'
import './App.css'
import DataManager from './services/DataManager'
import AnnotationStore from './services/AnnotationStore-optimized'
import PlotComponent from './components/PlotComponent'
import Controls from './components/Controls'
import { APP_CONFIG, CHUNK_SIZE, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
import AnnotationDisplay from './components/AnnotationDisplay'
import { Link } from 'react-router-dom';

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

function App({dataManager, annotationStore}: {dataManager: DataManager, annotationStore: AnnotationStore}) {
  const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
  const [chunkRange, setChunkRange] = useState({ start: 10, end: 100 })
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [currentFrame, setCurrentFrame] = useState(10)
  const [currentFrameData, setCurrentFrameData] = useState<{ x: number[]; y: number[] } | null>(null)
  const [isFetching, setIsFetching] = useState(false) // Track if data is being fetched
  const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false)

  useEffect(() => {
    const root = document.documentElement

    Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
      root.style.setProperty(variable, value)
    })

    document.title = APP_CONFIG.brand.title
  }, [])


  useEffect(() => {
    const fetchFrameData = async () => {
      setIsFetching(true) // Set fetching flag to true
      const frameData = await dataManager.getFrameData(currentFrame)
      if (frameData) {
        setCurrentFrameData({ x: frameData.players.x, y: frameData.players.y })
      } else {
        console.warn(`No data available for frame ${currentFrame}`)
        setCurrentFrameData(null)
      }
      setIsFetching(false) // Set fetching flag to false
    }

    fetchFrameData()
  }, [currentFrame])

  useEffect(() => {
    const fetchMatchData = async () => {
      const data = await dataManager.fetchMatchMetaData()
      if (data) {
        setMatchData(data)
        console.log('Match metadata:', data)
      } else {
        console.warn('No match metadata available')
      }
    }

    fetchMatchData()
  }, [])

  useEffect(() => {
    if (!isPlaying || isFetching) return // Only proceed if not fetching
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev >= 500 ? 10 : prev + 1))
    }, SLEEP_INTERVAL)

    return () => clearInterval(interval)
  }, [isPlaying, isFetching])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame)
    setIsPlaying(false) // Pause the animation when the user moves the slider
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="home-icon">
          <span>🏠</span>
        </Link>
      </aside>
      <header className="app-header">
        <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
        <div className="frame-status">Frame {currentFrame} / 50</div>
      </header>
      <div className="match-info">
        <div className="score">
          <div className="team">
            {matchData?.home_team.name}
            <ul className="players-list">
              {matchData?.players
                .filter(player => player.team_id === matchData.home_team.id && player.goal > 0)
                .map(player => (
                  <li key={player.id} className="player-item">
                    {player.first_name} {player.last_name} - {player.goal} goal(s)
                  </li>
                ))}
            </ul>
          </div>
          <div className="score-value">{matchData?.home_team_score} - {matchData?.away_team_score}</div>
          <div className="team">
            {matchData?.away_team.name}
            <ul className="players-list">
              {matchData?.players
                .filter(player => player.team_id === matchData.away_team.id && player.goal > 0)
                .map(player => (
                  <li key={player.id} className="player-item">
                    {player.first_name} {player.last_name} - {player.goal} goal(s)
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <div className="details">
          <div className="date">{matchData?.date_time ? new Date(matchData.date_time).toLocaleString() : 'Date not available'}</div>
          <div className="stadium">{matchData?.stadium.name}, {matchData?.stadium.city}</div>
        </div>
      </div>

      <div className="app-container">
        <div className="main-content">
          <Controls
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            currentFrame={currentFrame}
            frameRange={{ start: 10, end: 500 }} // Pass frame range
            onFrameChange={handleFrameChange}
            chunkRange={chunkRange} // Pass chunkRange to Controls
            annotationStore={annotationStore}
          />
          <PlotComponent currentFrame={currentFrame} x={currentFrameData? currentFrameData.x : []} y={currentFrameData? currentFrameData.y : []} annotationStore={annotationStore} onAnnotationUpdate={() => setAnnotationUpdateEvent(!annotationUpdateEvent)} />
        </div>
        <div className="right-panel">
          <AnnotationDisplay annotationStore={annotationStore} currentFrame={currentFrame} annotationUpdateEvent={annotationUpdateEvent} />
        </div>
      </div>
    </div>
  )
}

export default App