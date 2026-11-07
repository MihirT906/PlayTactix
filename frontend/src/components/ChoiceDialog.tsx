import { useEffect, useRef } from 'react'
import './ChoiceDialog.css'

export type DialogChoice = {
  label: string
  onSelect: () => void
  primary?: boolean
}

type ChoiceDialogProps = {
  title: string
  message: string
  choices: DialogChoice[]
  // Called on Cancel, Escape or a click on the backdrop.
  onCancel: () => void
}

/** A modal that asks the user to pick one of a few named choices, or cancel. Mount it to open it. */
export default function ChoiceDialog({ title, message, choices, onCancel }: ChoiceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="choice-dialog"
      aria-labelledby="choice-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      // A click on the dialog element itself, not its contents, landed on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <h2 id="choice-dialog-title" className="choice-dialog__title">{title}</h2>
      <p className="choice-dialog__message">{message}</p>
      <div className="choice-dialog__actions">
        <button type="button" className="choice-dialog__button" onClick={onCancel}>
          Cancel
        </button>
        {choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            className={`choice-dialog__button${choice.primary ? ' is-primary' : ''}`}
            onClick={choice.onSelect}
            autoFocus={choice.primary}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </dialog>
  )
}
