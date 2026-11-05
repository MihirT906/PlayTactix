import { useEffect } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { Link, Navigate, useParams } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import DocsPager from './DocsPager'
import DocsSidebar from './DocsSidebar'
import { DOCS_CONTENT } from './content'
import { DOCS_HOME_PATH, docsPagePath, findDocsPage } from './docsNav'
import './Docs.css'

// Serves both the docs home (/docs, no slug) and each page (/docs/:slug).
export default function DocsPage() {
  const { slug } = useParams()
  // Moving between pages (from the pager at the foot of one, say) starts the next at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])
  const page = slug ? findDocsPage(slug) : null
  if (slug && !page) return <Navigate to={DOCS_HOME_PATH} replace />
  const Content = page ? DOCS_CONTENT[page.slug] : undefined

  return (
    <div className="docs">
      <DocsSidebar />
      <article className="docs-article">
        <h1 className={`docs-title ${page ? '' : 'docs-title--home'}`}>{page ? page.title : 'Make your point on the pitch.'}</h1>
        {page ? null : (
          <>
            <p className="docs-lede">
              {APP_CONFIG.brand.title} is a whiteboard with a library of real matches you can load onto it. The player
              movement comes from tracking data, the overlays from built-in analysis, and the story from you.
            </p>
            <div className="docs-actions">
              <Link to={docsPagePath('choosing-a-match')} className="docs-cta">
                Take the tour <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
        {Content ? (
          <div className="docs-body">
            <Content />
          </div>
        ) : null}
        {page ? <DocsPager slug={page.slug} /> : null}
      </article>
    </div>
  )
}
