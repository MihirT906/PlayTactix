import { useEffect, useRef, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import './MultiSelectDropdown.css'

type MultiSelectDropdownProps<T> = {
  label: string
  options: T[]
  selected: T[]
  onChange: (values: T[]) => void
  formatOption?: (value: T) => string
  getKey?: (value: T) => string
}

function MultiSelectDropdown<T>({
  label,
  options,
  selected,
  onChange,
  formatOption = (value) => String(value),
  getKey = (value) => String(value),
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleOption = (value: T) => {
    const key = getKey(value)
    const isSelected = selected.some((v) => getKey(v) === key)
    onChange(isSelected ? selected.filter((v) => getKey(v) !== key) : [...selected, value])
  }

  const summary = selected.length === 0
    ? 'Any'
    : selected.length === 1
      ? formatOption(selected[0])
      : `${selected.length} selected`

  return (
    <div className="multi-select-dropdown" ref={containerRef}>
      <span className="multi-select-dropdown-label">{label}</span>
      <button
        type="button"
        className={`multi-select-dropdown-trigger${selected.length > 0 ? ' is-active' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="multi-select-dropdown-summary">{summary}</span>
        <FaChevronDown className={`multi-select-dropdown-arrow${isOpen ? ' is-expanded' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="multi-select-dropdown-menu">
          <button
            type="button"
            className={`multi-select-dropdown-option${selected.length === 0 ? ' is-active' : ''}`}
            onClick={() => onChange([])}
          >
            Any
          </button>
          {options.map((value) => {
            const key = getKey(value)
            const isSelected = selected.some((v) => getKey(v) === key)
            return (
              <label key={key} className="multi-select-dropdown-option">
                <input type="checkbox" checked={isSelected} onChange={() => toggleOption(value)} />
                <span>{formatOption(value)}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown
