// Studio routes. A channel is a "project"; older paths (/channels, /series, /episodes, /usage) redirect here.
export const ROUTES = {
  home: '/',
  review: '/',
  series: '/',
  library: '/library',
  channels: '/projects',
  newProject: '/projects/new',
  project: (id: string, sub = '') => `/projects/${id}${sub ? `/${sub}` : ''}`,
  skills: '/skills',
  tools: '/skills',
  templates: '/skills',
  usage: '/settings',
  settings: '/settings',
  seriesNew: '/',
  seriesOf: (id: string, _tab?: string) => `/series/${id}`,
  episode: (id: string) => `/episodes/${id}`,
} as const;
