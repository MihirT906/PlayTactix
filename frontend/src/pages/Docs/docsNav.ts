import { APP_CONFIG } from '../../config'

export type DocsNavPage = {
  slug: string
  title: string
}

export type DocsNavSection = {
  title: string
  pages: DocsNavPage[]
}

// The docs are one guide, for people using the app. It keeps the guide shape (its own home, sidebar and
// page order) so another guide could sit beside it later.
export type DocsGuideId = 'user'

export type DocsGuide = {
  id: DocsGuideId
  title: string
  homePath: string
  sections: DocsNavSection[]
}

const brand = APP_CONFIG.brand.title

export const DOCS_HOME_PATH = '/docs'

export const DOCS_GUIDES: Record<DocsGuideId, DocsGuide> = {
  user: {
    id: 'user',
    title: 'User guide',
    homePath: DOCS_HOME_PATH,
    // The sidebar, in order. Every page is listed here; a slug not listed is not a page.
    sections: [
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
          { slug: 'moments', title: 'Moments' },
          { slug: 'clips-and-moments', title: 'Clips and moments' },
          { slug: 'overlays', title: 'Overlays' },
          { slug: 'annotations', title: 'Annotations' },
          { slug: 'saving-and-loading-projects', title: 'Saving and loading projects' },
        ],
      },
      {
        // Worked analyses of real match moments, using the tools from the deep dive.
        title: 'Breakdowns',
        pages: [
          { slug: 'the-overlap', title: 'The overlap' },
        ],
      },
    ],
  },
}

// Every page of a guide in sidebar order, across its sections.
const guidePages = (guide: DocsGuideId) => DOCS_GUIDES[guide].sections.flatMap((section) => section.pages)

export const docsPagePath = (slug: string) => `${DOCS_GUIDES.user.homePath}/${slug}`

export const findDocsPage = (guide: DocsGuideId, slug: string) =>
  guidePages(guide).find((page) => page.slug === slug) ?? null

// The pages either side of this one in its guide's sidebar order; null at either end.
export const adjacentDocsPages = (guide: DocsGuideId, slug: string) => {
  const pages = guidePages(guide)
  const index = pages.findIndex((page) => page.slug === slug)
  return {
    previous: index > 0 ? pages[index - 1] : null,
    next: index >= 0 && index < pages.length - 1 ? pages[index + 1] : null,
  }
}
