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
      { slug: 'quick-start', title: 'Quick start' },
      { slug: 'key-concepts', title: 'Key concepts' },
    ],
  },
  {
    title: `Using ${brand}`,
    pages: [
      { slug: 'choosing-a-match', title: 'Choosing a match' },
      { slug: 'the-workspace', title: 'The workspace' },
      { slug: 'playback-and-the-timeline', title: 'Playback and the timeline' },
      { slug: 'clips-and-segments', title: 'Clips and segments' },
      { slug: 'annotations', title: 'Annotations' },
      { slug: 'overlays', title: 'Overlays' },
      { slug: 'key-moments', title: 'Key moments' },
      { slug: 'saving-and-loading-projects', title: 'Saving and loading projects' },
    ],
  },
  {
    title: 'How it works',
    pages: [
      { slug: 'architecture', title: 'Architecture' },
      { slug: 'match-data-and-the-backend-api', title: 'Match data and the backend API' },
      { slug: 'frame-data-and-caching', title: 'Frame data and caching' },
      { slug: 'rendering-the-pitch', title: 'Rendering the pitch' },
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

export const findDocsPage = (slug: string) =>
  DOCS_SECTIONS.flatMap((section) => section.pages).find((page) => page.slug === slug) ?? null
