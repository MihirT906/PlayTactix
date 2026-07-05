import { useEffect, useState } from 'react'
import { FaChartLine, FaFilter, FaPlus } from 'react-icons/fa'
import TimelineStore from '../services/TimelineStore'
import type { TimelineOption } from '../types/TimelineOption'
import './TimelineTab.css'

type SelectOption = {
  value: string
  label: string
}

const filterColumnOptions: SelectOption[] = [
  { value: 'event_type', label: 'event_type' },
  { value: 'event_subtype', label: 'event_subtype' },
]

const filterValueOptionsByColumn: Record<string, SelectOption[]> = {
  event_type: [
    { value: 'player_possession', label: 'player_possession' },
    { value: 'passing_option', label: 'passing_option' },
    { value: 'on_ball_engagement', label: 'on_ball_engagement' },
  ],
  event_subtype: [
    { value: 'behind', label: 'behind' },
    { value: 'coming_short', label: 'coming_short' },
    { value: 'cross_receiver', label: 'cross_receiver' },
    { value: 'dropping_off', label: 'dropping_off' },
    { value: 'overlap', label: 'overlap' },
    { value: 'pulling_half_space', label: 'pulling_half_space' },
    { value: 'run_ahead_of_the_ball', label: 'run_ahead_of_the_ball' },
    { value: 'support', label: 'support' },
    { value: 'underlap', label: 'underlap' },
    { value: 'pressing', label: 'pressing' },
    { value: 'pressure', label: 'pressure' },
    { value: 'counter_press', label: 'counter_press' },
    { value: 'recovery_press', label: 'recovery_press' },
    { value: 'other', label: 'other' },
  ],
}

const metricColumnOptions: SelectOption[] = [
  { value: 'n_opponents_overtaken', label: 'n_opponents_overtaken' },
  { value: 'xpass_completion', label: 'xpass_completion' },
  { value: 'xthreat', label: 'xthreat' },
  { value: 'xloss_player_possession_max', label: 'xloss_player_possession_max' },
]

const metricValueOptions: SelectOption[] = [
  { value: 'latest', label: 'latest' },
  { value: 'average', label: 'average' },
  { value: 'max', label: 'max' },
]

type TimelineTabProps = {
  timelineStore: TimelineStore
}

function TimelineTab({ timelineStore }: TimelineTabProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [activeOptionView, setActiveOptionView] = useState<'filter' | 'metric' | null>(null)
  const [selectedFilterColumn, setSelectedFilterColumn] = useState('')
  const [selectedFilterValue, setSelectedFilterValue] = useState('')
  const [selectedMetricColumn, setSelectedMetricColumn] = useState('')
  const [selectedMetricValue, setSelectedMetricValue] = useState('')
  const [savedTimelines, setSavedTimelines] = useState<TimelineOption[]>(timelineStore.getAll())

  useEffect(() => timelineStore.subscribe(setSavedTimelines), [timelineStore])

  const handleOptionSelect = (optionType: 'filter' | 'metric') => {
    setActiveOptionView(optionType)
    setIsAddMenuOpen(false)
  }

  const handleSaveFilterTimeline = () => {
    if (!selectedFilterColumn || !selectedFilterValue) {
      return
    }

    timelineStore.add({
      kind: 'filter',
      label: `${selectedFilterColumn} = ${selectedFilterValue}`,
      column: selectedFilterColumn,
      operator: 'equals',
      value: selectedFilterValue,
    })
    setSelectedFilterColumn('')
    setSelectedFilterValue('')
    setActiveOptionView(null)
  }

  const handleSaveMetricTimeline = () => {
    if (!selectedMetricColumn || !selectedMetricValue) {
      return
    }

    timelineStore.add({
      kind: 'metric',
      label: `${selectedMetricColumn} (${selectedMetricValue})`,
      column: selectedMetricColumn,
      aggregation: selectedMetricValue,
    })
    setSelectedMetricColumn('')
    setSelectedMetricValue('')
    setActiveOptionView(null)
  }

  let optionView = null

  if (activeOptionView === 'filter') {
    optionView = (
      <div className="timeline-option-form">
        <p className="timeline-option-placeholder">filter option</p>
        <label className="timeline-option-field">
          <span>Column</span>
          <select
            value={selectedFilterColumn}
            onChange={(event) => {
              setSelectedFilterColumn(event.target.value)
              setSelectedFilterValue('')
            }}
          >
            <option value="" disabled>
              Select column
            </option>
            {filterColumnOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="timeline-option-field">
          <span>Value</span>
          <select value={selectedFilterValue} onChange={(event) => setSelectedFilterValue(event.target.value)}>
            <option value="" disabled>
              Select value
            </option>
            {(filterValueOptionsByColumn[selectedFilterColumn] ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="timeline-save-button" onClick={handleSaveFilterTimeline}>
          Save
        </button>
      </div>
    )
  }

  if (activeOptionView === 'metric') {
    optionView = (
      <div className="timeline-option-form">
        <p className="timeline-option-placeholder">metric option</p>
        <label className="timeline-option-field">
          <span>Column</span>
          <select value={selectedMetricColumn} onChange={(event) => setSelectedMetricColumn(event.target.value)}>
            <option value="" disabled>
              Select column
            </option>
            {metricColumnOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="timeline-option-field">
          <span>Value</span>
          <select value={selectedMetricValue} onChange={(event) => setSelectedMetricValue(event.target.value)}>
            <option value="" disabled>
              Select value
            </option>
            {metricValueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="timeline-save-button" onClick={handleSaveMetricTimeline}>
          Save
        </button>
      </div>
    )
  }

  return (
    <div className="timeline-sidebar-placeholder">
      <h2>Timeline</h2>
      <p>Timeline controls will be added here.</p>
      {savedTimelines.length > 0 ? (
        <div className="timeline-option-form" aria-label="Saved timelines">
          <p className="timeline-option-placeholder">saved timelines</p>
          {savedTimelines.map((timeline) => (
            <p key={timeline.id}>{timeline.label}</p>
          ))}
        </div>
      ) : null}
      <div className="timeline-add-menu">
        <button
          type="button"
          className="app-header-action workspace-sidebar-action"
          onClick={() => setIsAddMenuOpen((previousValue) => !previousValue)}
          aria-expanded={isAddMenuOpen}
          aria-controls="timeline-add-options"
        >
          <FaPlus aria-hidden="true" />
          <span>Add</span>
        </button>

        {isAddMenuOpen ? (
          <div id="timeline-add-options" className="timeline-add-options" aria-label="Timeline option types">
            <button
              type="button"
              className="app-header-action workspace-sidebar-action timeline-add-option"
              onClick={() => handleOptionSelect('filter')}
            >
              <FaFilter aria-hidden="true" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              className="app-header-action workspace-sidebar-action timeline-add-option"
              onClick={() => handleOptionSelect('metric')}
            >
              <FaChartLine aria-hidden="true" />
              <span>Metric</span>
            </button>
          </div>
        ) : null}

        {optionView}
      </div>
    </div>
  )
}

export default TimelineTab