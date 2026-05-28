type TeamShirtProps = {
  side: 'left' | 'right'
  className?: string
}

function TeamShirt({ side, className = '' }: TeamShirtProps) {
  const classes = ['team-shirt', side, className].filter(Boolean).join(' ')

  return (
    <div className={classes} aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <path d="M20 6 L28 10 H36 L44 6 L54 16 L48 24 V54 H16 V24 L10 16 Z" />
      </svg>
    </div>
  )
}

export default TeamShirt