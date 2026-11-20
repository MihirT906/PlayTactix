import { useEffect, useRef, useState } from 'react'
import { FaPlay } from 'react-icons/fa'

// The intro video and its still, in frontend/public. Made in video/ (npm run render), then re-encoded at 720p for the
// web. The video is silent and loops cleanly: it starts and ends on black.
export const INTRO_VIDEO_SRC = '/landing/intro.mp4'
export const INTRO_POSTER_SRC = '/landing/intro-poster.jpg'

// The intro video next to the hero, paused: its still with a play button. Clicking it plays the video full size
// (IntroVideoDialog), so the video itself only loads then.
export function IntroVideoPreview({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="intro-video-trigger" onClick={onOpen} aria-label="Watch the intro video">
      <img className="intro-video-preview" src={INTRO_POSTER_SRC} alt="" />
      <span className="intro-video-play" aria-hidden="true">
        <FaPlay />
      </span>
    </button>
  )
}

type IntroVideoDialogProps = {
  open: boolean
  onClose: () => void
}

// The intro video in a modal over the page, full size with controls. The video only loads once the
// dialog is first opened, and stops when it closes. Escape, the close button or a click outside closes it.
export default function IntroVideoDialog({ open, onClose }: IntroVideoDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="intro-video-dialog"
      aria-label="Intro video"
      onClose={onClose}
      // The dialog box is the backdrop's only child, so a click landing on the dialog itself is outside the video.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button type="button" className="intro-video-close" onClick={onClose} aria-label="Close video">
        ×
      </button>
      {open ? (
        missing ? (
          <div className="intro-video-missing">
            To add: <code>frontend/public{INTRO_VIDEO_SRC}</code>
          </div>
        ) : (
          <video src={INTRO_VIDEO_SRC} poster={INTRO_POSTER_SRC} autoPlay controls playsInline onError={() => setMissing(true)} />
        )
      ) : null}
    </dialog>
  )
}
