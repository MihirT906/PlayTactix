// Stands in for a screenshot until one is captured.
export default function Screenshot({ caption }: { caption: string }) {
  return (
    <figure className="docs-screenshot">
      <figcaption>Screenshot: {caption}</figcaption>
    </figure>
  )
}
