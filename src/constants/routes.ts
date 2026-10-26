export const ROUTES = {
  home: '/',
  review: '/review',
  series: '/series',
  library: '/library',
  channels: '/channels',
  skills: '/skills',
  tools: '/tools',
  settings: '/settings',
  episode: (id: string) => `/episodes/${id}`,
} as const;
