import type { ContextLayer } from '../layer';

export const skillLayer: ContextLayer = {
  id: 'skill',
  title: 'Công thức video',
  order: 30,
  maxChars: 20000,
  render: ({ skill }) => `Skill "${skill.name}"${skill.description ? `: ${skill.description}` : ''}\n${skill.body}`,
};
