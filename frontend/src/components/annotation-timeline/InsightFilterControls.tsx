import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaUser } from 'react-icons/fa'
import type TimelineStore from '../../services/TimelineStore'
import { useStyleConfig } from '../../context/StyleConfigContext'
import type { Event } from '../../types/FrameDataInterfaces'
import type { MatchData } from '../../types/MatchDataInterfaces'
import type { InsightFilter } from '../../types/TimelineOption'
import { Popover } from '../context-menu/Popover'

type PlayerOption = {
  id: number
  teamId: number
  name: string
  number: number | null
  eventCount: number
}

type InsightFilterControlsProps = {
  timelineStore: TimelineStore
  matchData: MatchData | null
  /** The events in the clip, to list the players who appear in it. */
  clipEvents: Event[]
}

/**
 * Narrows the event tracks to one team and some of its players. Picking a team lets go of any
 * picked players from the other one.
 */
export function InsightFilterControls({ timelineStore, matchData, clipEvents }: InsightFilterControlsProps) {
  const { homeTeamColor, awayTeamColor } = useStyleConfig()
  const [filter, setFilter] = useState<InsightFilter>(timelineStore.getFilter())
  const [playersMenu, setPlayersMenu] = useState<{ x: number; y: number; anchor: HTMLElement } | null>(null)
  const closePlayersMenu = useCallback(() => setPlayersMenu(null), [])

  useEffect(() => timelineStore.subscribeFilter(setFilter), [timelineStore])

  const teams = matchData
    ? [
        { id: matchData.home_team.id, name: matchData.home_team.short_name, color: homeTeamColor },
        { id: matchData.away_team.id, name: matchData.away_team.short_name, color: awayTeamColor },
      ]
    : []

  // Everyone with an event in the clip, plus anyone already picked, by team and then shirt number.
  const players = useMemo<PlayerOption[]>(() => {
    const byId = new Map<number, PlayerOption>()
    const infoById = new Map((matchData?.players ?? []).map((player) => [player.id, player]))

    const ensure = (id: number, teamId: number, fallbackName: string) => {
      if (!byId.has(id)) {
        const info = infoById.get(id)
        byId.set(id, {
          id,
          teamId: info?.team_id ?? teamId,
          name: info?.short_name || fallbackName || `Player ${id}`,
          number: info?.number ?? null,
          eventCount: 0,
        })
      }
      return byId.get(id)!
    }

    for (const event of clipEvents) {
      ensure(event.player_id, event.team_id, event.player_name).eventCount += 1
    }
    for (const id of filter.playerIds) {
      ensure(id, infoById.get(id)?.team_id ?? -1, '')
    }

    const teamOrder = (teamId: number) => (teamId === matchData?.home_team.id ? 0 : teamId === matchData?.away_team.id ? 1 : 2)
    return Array.from(byId.values()).sort(
      (left, right) => teamOrder(left.teamId) - teamOrder(right.teamId) || (left.number ?? 999) - (right.number ?? 999),
    )
  }, [clipEvents, filter.playerIds, matchData])

  const listedPlayers = players.filter((player) => filter.teamId === null || player.teamId === filter.teamId)
  const pickedNames = players.filter((player) => filter.playerIds.includes(player.id)).map((player) => player.name)
  const playersSummary =
    pickedNames.length === 0 ? 'Any' : pickedNames.length === 1 ? pickedNames[0] : `${pickedNames.length} players`
  const isFiltered = filter.teamId !== null || filter.playerIds.length > 0

  const setTeam = (teamId: number | null) => {
    const playerIds =
      teamId === null
        ? filter.playerIds
        : filter.playerIds.filter((id) => players.find((player) => player.id === id)?.teamId === teamId)
    timelineStore.setFilter({ teamId, playerIds })
  }

  const togglePlayer = (playerId: number) => {
    const playerIds = filter.playerIds.includes(playerId)
      ? filter.playerIds.filter((id) => id !== playerId)
      : [...filter.playerIds, playerId]
    timelineStore.setFilter({ ...filter, playerIds })
  }

  return (
    <div className="insight-filter" role="group" aria-label="Filter event tracks" title="Filters the event tracks">
      <div className="insight-filter__teams">
        <button
          type="button"
          className="annotation-timeline__group-action"
          aria-pressed={filter.teamId === null}
          onClick={() => setTeam(null)}
        >
          Both
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            className="annotation-timeline__group-action"
            aria-pressed={filter.teamId === team.id}
            onClick={() => setTeam(team.id)}
          >
            <span className="insight-filter__swatch" style={{ background: team.color }} aria-hidden="true" />
            {team.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="annotation-timeline__group-action"
        aria-pressed={filter.playerIds.length > 0}
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
        <FaUser aria-hidden="true" />
        Players: {playersSummary}
        <FaChevronDown aria-hidden="true" />
      </button>
      {isFiltered ? (
        <button
          type="button"
          className="insight-filter__clear"
          onClick={() => timelineStore.setFilter({ teamId: null, playerIds: [] })}
        >
          Clear
        </button>
      ) : null}
      {playersMenu ? (
        <Popover
          x={playersMenu.x}
          y={playersMenu.y}
          anchor={playersMenu.anchor}
          onClose={closePlayersMenu}
          className="insight-filter__players"
          role="dialog"
        >
          <button
            type="button"
            className="context-menu__item"
            aria-pressed={filter.playerIds.length === 0}
            onClick={() => timelineStore.setFilter({ ...filter, playerIds: [] })}
          >
            Any player
          </button>
          {teams
            .filter((team) => filter.teamId === null || team.id === filter.teamId)
            .map((team) => {
              const teamPlayers = listedPlayers.filter((player) => player.teamId === team.id)
              return (
                <div key={team.id} role="group" aria-label={team.name}>
                  <div className="context-menu__section">{team.name}</div>
                  {teamPlayers.length === 0 ? (
                    <div className="insight-filter__none">No events in this clip</div>
                  ) : (
                    teamPlayers.map((player) => (
                      <label key={player.id} className="context-menu__item insight-filter__player">
                        <input
                          type="checkbox"
                          checked={filter.playerIds.includes(player.id)}
                          onChange={() => togglePlayer(player.id)}
                        />
                        <span className="insight-filter__player-number">{player.number ?? ''}</span>
                        <span className="insight-filter__player-name">{player.name}</span>
                        <span className="insight-menu-item__meta">{player.eventCount}</span>
                      </label>
                    ))
                  )}
                </div>
              )
            })}
        </Popover>
      ) : null}
    </div>
  )
}
