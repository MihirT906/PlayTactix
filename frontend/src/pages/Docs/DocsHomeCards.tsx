import type { IconType } from 'react-icons'
import { FaFilm, FaLayerGroup, FaPen, FaSearch } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { docsPagePath, findDocsPage } from './docsNav'

type DocsHomeCard = { slug: string; icon: IconType; blurb: string }

// The quick links on the docs home: the four things you do to build a clip. Titles come from the sidebar.
const CARDS: DocsHomeCard[] = [
  { slug: 'moments', icon: FaSearch, blurb: 'Filter the match down to the passages worth showing.' },
  {
    slug: 'overlays',
    icon: FaLayerGroup,
    blurb: 'Pitch control, pass probability, pass networks and more, on top of the play.',
  },
  {
    slug: 'annotations',
    icon: FaPen,
    blurb: 'Spotlight players, link them, outline the team shape, or draw your own.',
  },
  { slug: 'clips-and-segments', icon: FaFilm, blurb: 'Stitch moments from across the match into one clip.' },
]

export default function DocsHomeCards() {
  return (
    <ul className="docs-cards">
      {CARDS.map(({ slug, icon: Icon, blurb }) => (
        <li key={slug}>
          <Link to={docsPagePath(slug)} className="docs-card">
            <span className="docs-card-title">
              <Icon aria-hidden="true" /> {findDocsPage(slug)?.title}
            </span>
            <span className="docs-card-blurb">{blurb}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
