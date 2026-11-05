import { describe, expect, it } from 'vitest'
import AnnotationStore from './AnnotationStore-optimized'
import TimelineStore from './TimelineStore'
import { createInitialMatchSessionState } from '../context/MatchSessionContext'
import { restoreProject, serializeProject } from './projectSerializer'
import { parseProject, type SavedProject } from '../types/SavedProject'

const MATCH_ID = 2017461

// The home colour is still its kit's and the away colour was picked by the user.
const style = {
  homeTeamColor: '#3B82F6',
  awayTeamColor: '#123456',
  kitColors: { home: '#3B82F6', away: '#EF4444' },
  teamVisibility: { home: true, away: false },
  eventStyles: { offBallRun: { color: '#FF6B3D', width: 2 } },
  eventVisibility: { offBallRun: false },
}

// One of every annotation type and both kinds of track.
function buildWork() {
  const session = createInitialMatchSessionState(MATCH_ID)
  const annotationStore = new AnnotationStore()
  annotationStore.addDrawAnnotation({ type: 'rect', x0: -10, y0: -5, x1: 10, y1: 5 }, 0)
  annotationStore.addDrawAnnotation({ type: 'line', x0: 0, y0: 0, x1: 20, y1: 0 }, 5)
  annotationStore.addArrowAnnotation(1, 2, 3, 4, 10)
  annotationStore.addPlayerLineAnnotation(11, 12, 15)
  annotationStore.setTeamShapePlayers(null, [1, 2, 3], 20)
  annotationStore.togglePlayerFocus(7, 25)

  const timelineStore = new TimelineStore()
  timelineStore.add({ kind: 'filter', eventType: 'carry' })
  timelineStore.add({ kind: 'metric', label: 'Momentum', column: 'momentum' })

  return { session, annotationStore, timelineStore }
}

const save = () => {
  const work = buildWork()
  return { work, saved: serializeProject({ ...work, style, matchData: null }) }
}

const load = (project: unknown) => restoreProject(parseProject(JSON.stringify(project)))

describe('project round trip', () => {
  it('restores what was saved', () => {
    const { work, saved } = save()
    const restored = load(saved)

    expect(restored.matchId).toBe(MATCH_ID)
    expect(restored.session.clip).toEqual(work.session.playback.clip)
    expect(restored.session.eventMapFilters).toEqual(work.session.overlays.eventMapFilters)
    expect(restored.session.passNetworkConfig).toEqual(work.session.overlays.passNetworkConfig)
    expect(restored.annotations).toEqual(work.annotationStore.getAllAnnotations())
    expect(restored.timelines).toEqual(work.timelineStore.getAll())
    expect(restored.style).toEqual({
      homeTeamColor: null,
      awayTeamColor: '#123456',
      teamVisibility: style.teamVisibility,
      eventStyles: style.eventStyles,
      eventVisibility: style.eventVisibility,
    })
  })

  it('leaves out what is rebuilt on load', () => {
    const { saved } = save()

    expect(saved.clip.matchSegments.every((segment) => !('matchId' in segment))).toBe(true)
    expect(saved.analysis.timelines.every((timeline) => !('label' in timeline))).toBe(true)
  })
})

describe('parseProject', () => {
  const withChange = (change: (project: SavedProject) => unknown) => change(structuredClone(save().saved))

  it('rejects a file that is not JSON', () => {
    expect(() => parseProject('{')).toThrow('not valid JSON')
  })

  it('rejects a file that is not a project', () => {
    expect(() => load(withChange((project) => ({ ...project, format: 'something-else' })))).toThrow('not a')
  })

  it('rejects a project from a newer version', () => {
    expect(() => load(withChange((project) => ({ ...project, schemaVersion: 99 })))).toThrow('newer version')
  })

  it('names a provider and sport it cannot open', () => {
    const basketball = withChange((project) => ({ ...project, match: { ...project.match, sport: 'basketball' } }))
    expect(() => load(basketball)).toThrow('basketball match from skillcorner')
  })

  it('rejects a team shape around too few players', () => {
    const project = withChange((project) => {
      const teamShape = project.annotations.find((annotation) => annotation.type === 'teamShape')
      if (teamShape) teamShape.shape.players = [1, 2]
      return project
    })
    expect(() => load(project)).toThrow('incomplete or corrupted')
  })

  it('rejects an overlay that ends before it starts', () => {
    const project = withChange((project) => {
      project.clip.overlaySegments[0] = { type: 'pitch', clipStart: 50, clipEnd: 10 }
      return project
    })
    expect(() => load(project)).toThrow('incomplete or corrupted')
  })
})
