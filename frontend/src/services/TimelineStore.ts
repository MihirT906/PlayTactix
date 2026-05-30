import type {
    TimelineCondition,
    TimelineFilterOperator,
    TimelineFilterValue,
    TimelineOption,
} from '../types/TimelineOption'

type CreateFilterTimelineInput = {
    kind: 'filter'
    label: string
    column: string
    operator: TimelineFilterOperator
    value: TimelineFilterValue
}

type CreateMetricTimelineInput = {
    kind: 'metric'
    label: string
    column: string
    aggregation: string
}

type CreateTimelineInput = CreateFilterTimelineInput | CreateMetricTimelineInput

type TimelineStoreListener = (timelines: TimelineOption[]) => void

export default class TimelineStore {
    private timelines: TimelineOption[] = []
    private listeners: Set<TimelineStoreListener> = new Set()

    add(input: CreateTimelineInput): TimelineOption {
        const timeline = this.createTimeline(input)
        this.timelines.push(timeline)
        this.notifyListeners()
        return timeline
    }

    getAll(): TimelineOption[] {
        return [...this.timelines]
    }

    getById(id: string): TimelineOption | undefined {
        return this.timelines.find((timeline) => timeline.id === id)
    }

    clear(): void {
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
            const condition: TimelineCondition = {
                column: input.column,
                operator: input.operator,
                value: input.value,
            }

            return {
                id,
                label: input.label,
                kind: 'filter',
                condition,
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
        return `timeline-${Date.now()}-${this.timelines.length + 1}`
    }

    private notifyListeners(): void {
        const timelines = this.getAll()

        for (const listener of this.listeners) {
            listener(timelines)
        }
    }
}
