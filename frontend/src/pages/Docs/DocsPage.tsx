import { useEffect } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { Link, Navigate, useParams } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import DocsHomeCards from './DocsHomeCards'
import DocsPager from './DocsPager'
import DocsSidebar from './DocsSidebar'
import { DOCS_CONTENT } from './content'
import { DOCS_GUIDES, docsPagePath, findDocsPage, type DocsGuideId } from './docsNav'
import './Docs.css'

// Serves a guide's home (no slug) and each of its pages: /docs and /docs/:slug for the user guide,
// /docs/developers and /docs/developers/:slug for the developer docs.
export default function DocsPage({ guide }: { guide: DocsGuideId }) {
  const { slug } = useParams()
  // Moving between pages (from the pager at the foot of one, say) starts the next at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])
  const page = slug ? findDocsPage(guide, slug) : null
  if (slug && !page) return <Navigate to={DOCS_GUIDES[guide].homePath} replace />
  const Content = page ? DOCS_CONTENT[page.slug] : undefined

  return (
    <div className="docs">
      <DocsSidebar guide={guide} />
      <article className="docs-article">
        <h1 className={`docs-title ${page ? '' : 'docs-title--home'}`}>
          {page ? page.title : guide === 'user' ? 'Make your point on the pitch.' : 'Developer docs'}
        </h1>
        {page ? null : guide === 'developers' ? (
          <p className="docs-lede">
            How {APP_CONFIG.brand.title} is built and why: the path match data takes from the provider to the pitch,
            and the decisions behind it.
          </p>
        ) : (
          <>
            <p className="docs-lede">
              {APP_CONFIG.brand.title} is a whiteboard with a library of real matches you can load onto it. The player
              movement comes from tracking data, the overlays from built-in analysis, and the story from you.
            </p>
            <div className="docs-actions">
              <Link to={docsPagePath('choosing-a-match')} className="docs-cta">
                Take the tour <FaArrowRight aria-hidden="true" />
              </Link>
              <Link to={docsPagePath('what-is-tappd')} className="docs-cta-secondary">
                What is {APP_CONFIG.brand.title}?
              </Link>
            </div>
            <DocsHomeCards />
          </>
        )}
        {Content ? (
          <div className="docs-body">
            <Content />
          </div>
        ) : null}
        {page ? <DocsPager guide={guide} slug={page.slug} /> : null}
      </article>
    </div>
  )
}
