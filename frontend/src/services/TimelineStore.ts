import type {
    AggregationMethod,
    FilterTimelineOption,
    InsightFilter,
    MetricTimelineOption,
    TimelineOption,
} from '../types/TimelineOption'
import { getFilterTimelineLabel } from './timelineEvents'

type CreateFilterTimelineInput = {
    kind: 'filter'
    eventType: string
}

type CreateMetricTimelineInput = {
    kind: 'metric'
    label: string
    column: string
    aggregation: AggregationMethod
}

type CreatePhasesTimelineInput = {
    kind: 'phases'
}

type CreateTimelineInput = CreateFilterTimelineInput | CreateMetricTimelineInput | CreatePhasesTimelineInput

type TimelineStoreListener = (timelines: TimelineOption[]) => void
type InsightFilterListener = (filter: InsightFilter) => void

const PHASES_LABEL = 'Phases of play'
const NO_FILTER: InsightFilter = { teamId: null, playerIds: [] }

export default class TimelineStore {
    // Declared first, as the initial phases track below takes an id from it.
    private createdCount = 0
    // A match opens with the phases track, so every other track has the phases to be read against.
    private timelines: TimelineOption[] = [this.createTimeline({ kind: 'phases' })]
    private listeners: Set<TimelineStoreListener> = new Set()
    // The filter is how the tracks are being looked at, not part of the work, so projects don't save it.
    private filter: InsightFilter = NO_FILTER
    private filterListeners: Set<InsightFilterListener> = new Set()

    add(input: CreateTimelineInput): TimelineOption {
        const timeline = this.createTimeline(input)
        this.timelines.push(timeline)
        this.notifyListeners()
        return timeline
    }

    // Removes the phases track if there is one, otherwise adds it as the first track.
    togglePhases(): void {
        if (this.timelines.some((timeline) => timeline.kind === 'phases')) {
            this.timelines = this.timelines.filter((timeline) => timeline.kind !== 'phases')
        } else {
            this.timelines = [this.createTimeline({ kind: 'phases' }), ...this.timelines]
        }
        this.notifyListeners()
    }

    // Removes the metric's tracks if there are any, otherwise adds one. Returns the track added, if any.
    toggleMetric(input: Omit<CreateMetricTimelineInput, 'kind'>): TimelineOption | null {
        if (this.timelines.some((timeline) => timeline.kind === 'metric' && timeline.column === input.column)) {
            this.timelines = this.timelines.filter((timeline) => timeline.kind !== 'metric' || timeline.column !== input.column)
            this.notifyListeners()
            return null
        }

        return this.add({ kind: 'metric', ...input })
    }

    load(timelines: TimelineOption[]): void {
        // Replaces all timelines with previously saved ones, keeping their saved ids.
        this.timelines = [...timelines]
        this.notifyListeners()
    }

    updateFilter(id: string, changes: Partial<Pick<FilterTimelineOption, 'subtypes' | 'splitBySubtype' | 'heightBy'>>): void {
        this.timelines = this.timelines.map((timeline) => {
            if (timeline.id !== id || timeline.kind !== 'filter') {
                return timeline
            }

            const updated = { ...timeline, ...changes }
            return { ...updated, label: getFilterTimelineLabel(updated.eventType, updated.subtypes) }
        })
        this.notifyListeners()
    }

    updateMetric(id: string, changes: Pick<MetricTimelineOption, 'aggregation'>): void {
        this.timelines = this.timelines.map((timeline) =>
            timeline.id === id && timeline.kind === 'metric' ? { ...timeline, ...changes } : timeline,
        )
        this.notifyListeners()
    }

    setHidden(id: string, hidden: boolean): void {
        this.timelines = this.timelines.map((timeline) => (timeline.id === id ? { ...timeline, hidden } : timeline))
        this.notifyListeners()
    }

    remove(id: string): void {
        this.timelines = this.timelines.filter((timeline) => timeline.id !== id)
        this.notifyListeners()
    }

    getAll(): TimelineOption[] {
        return [...this.timelines]
    }

    getById(id: string): TimelineOption | undefined {
        return this.timelines.find((timeline) => timeline.id === id)
    }

    // Back to how a newly opened match starts: just the phases track, and no filter.
    reset(): void {
        this.timelines = [this.createTimeline({ kind: 'phases' })]
        this.notifyListeners()
        this.setFilter(NO_FILTER)
    }

    getFilter(): InsightFilter {
        return this.filter
    }

    setFilter(filter: InsightFilter): void {
        this.filter = filter
        for (const listener of this.filterListeners) {
            listener(filter)
        }
    }

    subscribeFilter(listener: InsightFilterListener): () => void {
        this.filterListeners.add(listener)
        listener(this.filter)

        return () => {
            this.filterListeners.delete(listener)
        }
    }

    subscribe(listener: TimelineStoreListener): () => void {
        this.listeners.add(listener)
        listener(this.getAll())

        return () => {
            this.listeners.delete(listener)
        }
    }

    private createTimeline(input: CreateTimelineInput): TimelineOption {
        const id = this.createTimelineId()

        if (input.kind === 'phases') {
            return { id, label: PHASES_LABEL, kind: 'phases' }
        }

        if (input.kind === 'filter') {
            return {
                id,
                label: getFilterTimelineLabel(input.eventType, []),
                kind: 'filter',
                eventType: input.eventType,
                subtypes: [],
                splitBySubtype: false,
            }
        }

        return {
            id,
            label: input.label,
            kind: 'metric',
            column: input.column,
            aggregation: input.aggregation,
        }
    }

    private createTimelineId(): string {
        this.createdCount += 1
        return `timeline-${Date.now()}-${this.createdCount}`
    }

    private notifyListeners(): void {
        const timelines = this.getAll()

        for (const listener of this.listeners) {
            listener(timelines)
        }
    }
}
