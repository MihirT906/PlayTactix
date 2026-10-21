import type { FilterTimelineOption, TimelineOption } from '../types/TimelineOption'
import { getFilterTimelineLabel } from './timelineEvents'

type CreateFilterTimelineInput = {
    kind: 'filter'
    eventType: string
}

type CreateMetricTimelineInput = {
    kind: 'metric'
    label: string
    column: string
}

type CreateTimelineInput = CreateFilterTimelineInput | CreateMetricTimelineInput

type TimelineStoreListener = (timelines: TimelineOption[]) => void


export default class TimelineStore {
    private createdCount = 0
    private timelines: TimelineOption[] = []
    private listeners: Set<TimelineStoreListener> = new Set()

    add(input: CreateTimelineInput): TimelineOption {
        const timeline = this.createTimeline(input)
        this.timelines.push(timeline)
        this.notifyListeners()
        return timeline
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

    updateFilter(id: string, changes: Partial<Pick<FilterTimelineOption, 'subtypes' | 'splitBySubtype' | 'heightBy' | 'teamId' | 'playerIds'>>): void {
        this.timelines = this.timelines.map((timeline) => {
            if (timeline.id !== id || timeline.kind !== 'filter') {
                return timeline
            }

            const updated = { ...timeline, ...changes }
            return { ...updated, label: getFilterTimelineLabel(updated.eventType, updated.subtypes) }
        })
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

    // Back to how a newly opened match starts: no tracks.
    reset(): void {
        this.timelines = []
        this.notifyListeners()
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
