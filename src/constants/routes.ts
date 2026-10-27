export const ROUTES = {
  home: '/',
  review: '/review',
  series: '/series',
  library: '/library',
  channels: '/channels',
  skills: '/skills',
  tools: '/tools',
  usage: '/usage',
  settings: '/settings',
  seriesNew: '/series/new',
  seriesOf: (id: string, tab?: string) => `/series/${id}${tab ? `?tab=${tab}` : ''}`,
  episode: (id: string) => `/episodes/${id}`,
} as const;
