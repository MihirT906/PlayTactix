import { useCallback, useMemo, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { useStyleConfig } from '../context/StyleConfigContext'
import type { Event } from '../types/FrameDataInterfaces'
import type { MatchData } from '../types/MatchDataInterfaces'
import type { FilterTimelineOption } from '../types/TimelineOption'
import { Popover } from './context-menu/Popover'

type PlayerOption = {
  id: number
  teamId: number
  name: string
  number: number | null
  eventCount: number
}

type TrackFilterChanges = Pick<FilterTimelineOption, 'teamId' | 'playerIds'>

type TrackFilterProps = {
  timeline: FilterTimelineOption
  onChange: (changes: TrackFilterChanges) => void
  matchData: MatchData | null
  /** The track's events in the clip before its team and players are applied, to list who appears. */
  trackEvents: Event[]
}

/**
 * Narrows one event track to a team and some of its players. Picking a team lets go of any picked
 * players from the other one.
 */
export function TrackFilter({ timeline, onChange, matchData, trackEvents }: TrackFilterProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [playersMenu, setPlayersMenu] = useState<{ x: number; y: number; anchor: HTMLElement } | null>(null)
  const closePlayersMenu = useCallback(() => setPlayersMenu(null), [])
  const teamId = timeline.teamId ?? null
  const playerIds = useMemo(() => timeline.playerIds ?? [], [timeline.playerIds])

  const teams = matchData
    ? [
        { id: matchData.home_team.id, name: matchData.home_team.short_name, color: homeTeamColor },
        { id: matchData.away_team.id, name: matchData.away_team.short_name, color: awayTeamColor },
      ]
    : []

  // Everyone with one of the track's events in the clip, plus anyone already picked, by team and
  // then shirt number.
  const players = useMemo<PlayerOption[]>(() => {
    const byId = new Map<number, PlayerOption>()
    const infoById = new Map((matchData?.players ?? []).map((player) => [player.id, player]))

    const ensure = (id: number, fallbackTeamId: number, fallbackName: string) => {
      if (!byId.has(id)) {
        const info = infoById.get(id)
        byId.set(id, {
          id,
          teamId: info?.team_id ?? fallbackTeamId,
          name: info?.short_name || fallbackName || `Player ${id}`,
          number: info?.number ?? null,
          eventCount: 0,
        })
      }
      return byId.get(id)!
    }

    for (const event of trackEvents) {
      ensure(event.player_id, event.team_id, event.player_name).eventCount += 1
    }
    for (const id of playerIds) {
      ensure(id, infoById.get(id)?.team_id ?? -1, '')
    }

    const teamOrder = (id: number) => (id === matchData?.home_team.id ? 0 : id === matchData?.away_team.id ? 1 : 2)
    return Array.from(byId.values()).sort(
      (left, right) => teamOrder(left.teamId) - teamOrder(right.teamId) || (left.number ?? 999) - (right.number ?? 999),
    )
  }, [trackEvents, playerIds, matchData])

  const pickedNames = players.filter((player) => playerIds.includes(player.id)).map((player) => player.name)
  const playersSummary =
    pickedNames.length === 0 ? 'Any player' : pickedNames.length === 1 ? pickedNames[0] : `${pickedNames.length} players`

  const setTeam = (nextTeamId: number | null) => {
    onChange({
      teamId: nextTeamId,
      playerIds:
        nextTeamId === null
          ? playerIds
          : playerIds.filter((id) => players.find((player) => player.id === id)?.teamId === nextTeamId),
    })
  }

  const togglePlayer = (playerId: number) => {
    onChange({
      teamId,
      playerIds: playerIds.includes(playerId) ? playerIds.filter((id) => id !== playerId) : [...playerIds, playerId],
    })
  }

  return (
    <>
      <div className="timeline-track-field">
        <span className="timeline-track-field-label">Team</span>
        <div className="timeline-chip-group" role="group" aria-label={`${timeline.label} team`}>
          <button type="button" className="timeline-chip" aria-pressed={teamId === null} onClick={() => setTeam(null)}>
            Both
          </button>
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              className="timeline-chip"
              aria-pressed={teamId === team.id}
              onClick={() => setTeam(team.id)}
            >
              <span className="timeline-chip-swatch" style={{ background: team.color }} aria-hidden="true" />
              {team.name}
            </button>
          ))}
        </div>
      </div>
      <div className="timeline-track-field">
        <span className="timeline-track-field-label">Players</span>
        <button
          type="button"
          className="timeline-chip timeline-dropdown"
          aria-pressed={playerIds.length > 0}
          aria-haspopup="dialog"
          aria-expanded={playersMenu !== null}
          onClick={(event) => {
            if (playersMenu) {
              setPlayersMenu(null)
              return
            }
            const rect = event.currentTarget.getBoundingClientRect()
            setPlayersMenu({ x: rect.left, y: rect.bottom + 4, anchor: event.currentTarget })
          }}
        >
          <span className="timeline-dropdown-value">{playersSummary}</span>
          <FaChevronDown aria-hidden="true" />
        </button>
      </div>
      {playersMenu ? (
        <Popover
          x={playersMenu.x}
          y={playersMenu.y}
          anchor={playersMenu.anchor}
          onClose={closePlayersMenu}
          className="timeline-player-menu"
          role="dialog"
        >
          <button
            type="button"
            className="context-menu__item"
            aria-pressed={playerIds.length === 0}
            onClick={() => onChange({ teamId, playerIds: [] })}
          >
            Any player
          </button>
          {teams
            .filter((team) => teamId === null || team.id === teamId)
            .map((team) => {
              const teamPlayers = players.filter((player) => player.teamId === team.id)
              return (
                <div key={team.id} role="group" aria-label={team.name}>
                  <div className="context-menu__section">{team.name}</div>
                  {teamPlayers.length === 0 ? (
                    <div className="timeline-player-menu__none">No {timeline.label.toLowerCase()} in this clip</div>
                  ) : (
                    teamPlayers.map((player) => (
                      <label key={player.id} className="context-menu__item timeline-player-menu__player">
                        <input
                          type="checkbox"
                          checked={playerIds.includes(player.id)}
                          onChange={() => togglePlayer(player.id)}
                        />
                        <span className="timeline-player-menu__number">{player.number ?? ''}</span>
                        <span className="timeline-player-menu__name">{player.name}</span>
                        <span className="timeline-player-menu__count">{player.eventCount}</span>
                      </label>
                    ))
                  )}
                </div>
              )
            })}
        </Popover>
      ) : null}
    </>
  )
}
