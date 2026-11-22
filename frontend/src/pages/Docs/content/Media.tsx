import { useState } from 'react'

// A screenshot or a short looping clip from frontend/public/docs-media. Videos start paused on their first frame;
// the browser's controls play them (muted, on a loop) and scrub.
// Until the file is captured, a dashed box says what belongs there.
export default function Media({ src, caption }: { src: string; caption: string }) {
  const [missing, setMissing] = useState(false)
  const url = `/docs-media/${src}`
  const isVideo = /\.(mp4|webm)$/.test(src)

  if (missing) {
    return (
      <figure className="docs-media docs-media--missing">
        <figcaption>
          To capture: <code>{src}</code>, {caption}
        </figcaption>
      </figure>
    )
  }

  return (
    <figure className="docs-media">
      {isVideo ? (
        <video
          src={url}
          aria-label={caption}
          preload="metadata"
          loop
          muted
          playsInline
          controls
          onError={() => setMissing(true)}
        />
      ) : (
        <img src={url} alt={caption} loading="lazy" onError={() => setMissing(true)} />
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
