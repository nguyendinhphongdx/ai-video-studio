// Skills are files: content/skills/<id>/SKILL.md, versioned with git. The file is the only source of truth.
import fs from 'node:fs/promises';
import path from 'node:path';

import { SKILL_ID_RE } from '@/core/skills/skill';
import { SKILLS_DIR } from '@/server/config';

export const skillFile = (id: string) => path.join(SKILLS_DIR, id, 'SKILL.md');
const fileOf = skillFile;

export const skillRepository = {
  async ids(): Promise<string[]> {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true }).catch(() => []);
    return entries.filter((e) => e.isDirectory() && SKILL_ID_RE.test(e.name)).map((e) => e.name).sort();
  },
  async read(id: string): Promise<string | null> {
    if (!SKILL_ID_RE.test(id)) return null;
    return fs.readFile(fileOf(id), 'utf8').catch(() => null);
  },
  async write(id: string, markdown: string): Promise<void> {
    await fs.mkdir(path.dirname(fileOf(id)), { recursive: true });
    const tmp = `${fileOf(id)}.${process.pid}.tmp`;
    await fs.writeFile(tmp, markdown);
    await fs.rename(tmp, fileOf(id));
  },
};
