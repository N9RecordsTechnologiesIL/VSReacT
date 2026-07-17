// Single source of truth for the docs tree: sidebar order, groups, pager.

export interface DocPage {
  slug: string // '' = /docs
  title: string
  group: string
}

export const DOCS: DocPage[] = [
  { slug: '', title: 'Introduction', group: 'OVERVIEW' },
  { slug: 'installation', title: 'Installation', group: 'GETTING STARTED' },
  { slug: 'quick-start', title: 'Quick start', group: 'GETTING STARTED' },
  { slug: 'integration', title: 'Your plugin, in React', group: 'GETTING STARTED' },
  { slug: 'hot-reload', title: 'Hot reload & shipping', group: 'GETTING STARTED' },
  { slug: 'components', title: 'Components', group: 'UI REFERENCE' },
  { slug: 'styling', title: 'Styling', group: 'UI REFERENCE' },
  { slug: 'events', title: 'Events & gestures', group: 'UI REFERENCE' },
  { slug: 'animation', title: 'Animation', group: 'UI REFERENCE' },
  { slug: 'parameters', title: 'Audio parameters', group: 'AUDIO & NATIVE' },
  { slug: 'native-messaging', title: 'Native messaging', group: 'AUDIO & NATIVE' },
  { slug: 'cpp-api', title: 'C++ API', group: 'AUDIO & NATIVE' },
  { slug: 'architecture', title: 'Architecture', group: 'INTERNALS' },
  { slug: 'testing', title: 'Testing', group: 'INTERNALS' },
  { slug: 'faq', title: 'FAQ', group: 'PROJECT' },
  { slug: 'support', title: 'Support & license', group: 'PROJECT' },
]

export const hrefFor = (page: DocPage): string => (page.slug ? `/docs/${page.slug}` : '/docs')
