import { APP_CONFIG } from '../../config'

export type DocsNavPage = {
  slug: string
  title: string
}

export type DocsNavSection = {
  title: string
  pages: DocsNavPage[]
}

const brand = APP_CONFIG.brand.title

export const DOCS_HOME_PATH = '/docs'
export const docsPagePath = (slug: string) => `${DOCS_HOME_PATH}/${slug}`

// The sidebar, in order. Every docs page is listed here; a slug not listed is not a page.
export const DOCS_SECTIONS: DocsNavSection[] = [
  {
    title: 'Getting started',
    pages: [
      { slug: 'what-is-tappd', title: `What is ${brand}` },
    ],
  },
  {
    title: `${brand} tour`,
    pages: [
      { slug: 'choosing-a-match', title: 'Choosing a match' },
      { slug: 'the-workspace', title: 'The workspace' },
    ],
  },
  {
    // One page per tool, in the order you use them to build a clip; the tour links into these.
    title: 'Deep dive',
    pages: [
      { slug: 'playback-and-the-timeline', title: 'Playback and the timeline' },
      { slug: 'key-moments', title: 'Search for key moments' },
      { slug: 'clips-and-segments', title: 'Clips and segments' },
      { slug: 'overlays', title: 'Overlays' },
      { slug: 'annotations', title: 'Annotations' },
      { slug: 'saving-and-loading-projects', title: 'Saving and loading projects' },
    ],
  },
  {
    title: 'How it works',
    pages: [
      { slug: 'architecture', title: 'Architecture' },
    ],
  },
  {
    title: 'Design decisions',
    pages: [
      { slug: 'frame-data-caching-proposal', title: 'Frame data caching proposal' },
      { slug: 'multi-user-match-caching', title: 'Multi-user match caching' },
    ],
  },
]

// Every page in sidebar order, across sections.
const DOCS_PAGES = DOCS_SECTIONS.flatMap((section) => section.pages)

export const findDocsPage = (slug: string) => DOCS_PAGES.find((page) => page.slug === slug) ?? null

// The pages either side of this one in sidebar order; null at either end.
export const adjacentDocsPages = (slug: string) => {
  const index = DOCS_PAGES.findIndex((page) => page.slug === slug)
  return {
    previous: index > 0 ? DOCS_PAGES[index - 1] : null,
    next: index >= 0 && index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : null,
  }
}
