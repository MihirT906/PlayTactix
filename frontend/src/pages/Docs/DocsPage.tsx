import { Navigate, useParams } from 'react-router-dom'
import { APP_CONFIG } from '../../config'
import DocsSidebar from './DocsSidebar'
import { DOCS_HOME_PATH, findDocsPage } from './docsNav'
import './Docs.css'

// Serves both the docs home (/docs, no slug) and each page (/docs/:slug).
export default function DocsPage() {
  const { slug } = useParams()
  const page = slug ? findDocsPage(slug) : null
  if (slug && !page) return <Navigate to={DOCS_HOME_PATH} replace />

  return (
    <div className="docs">
      <DocsSidebar />
      <article className="docs-article">
        <h1 className="docs-title">{page ? page.title : `${APP_CONFIG.brand.title} docs`}</h1>
      </article>
    </div>
  )
}
