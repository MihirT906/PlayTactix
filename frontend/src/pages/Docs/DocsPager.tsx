import { Link } from 'react-router-dom'
import { adjacentDocsPages, docsPagePath } from './docsNav'

// Previous and next links at the foot of a page, following the sidebar order.
export default function DocsPager({ slug }: { slug: string }) {
  const { previous, next } = adjacentDocsPages(slug)

  return (
    <nav className="docs-pager" aria-label="Previous and next pages">
      {previous ? (
        <Link to={docsPagePath(previous.slug)} className="docs-pager-link">
          <span className="docs-pager-label">← Previous</span>
          <span className="docs-pager-title">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link to={docsPagePath(next.slug)} className="docs-pager-link docs-pager-link--next">
          <span className="docs-pager-label">Next →</span>
          <span className="docs-pager-title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}
