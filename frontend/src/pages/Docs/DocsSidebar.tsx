import { NavLink } from 'react-router-dom'
import { DOCS_SECTIONS, docsPagePath } from './docsNav'

export default function DocsSidebar() {
  return (
    <nav className="docs-sidebar" aria-label="Docs">
      {DOCS_SECTIONS.map((section) => (
        <section key={section.title} className="docs-sidebar-section">
          <h2 className="docs-sidebar-heading">{section.title}</h2>
          <ul className="docs-sidebar-list">
            {section.pages.map((page) => (
              <li key={page.slug}>
                <NavLink
                  to={docsPagePath(page.slug)}
                  className={({ isActive }) => `docs-sidebar-link ${isActive ? 'is-active' : ''}`}
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
