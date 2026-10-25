import type { Format, Project, ProjectEvent, Render, Scene } from '@/core/domain';
import { newId } from '@/core/pipeline';
import { db, json, now, transaction } from '@/server/db';

type Row = Record<string, unknown>;

const toScene = (r: Row): Scene => ({ id: String(r.id), tool: String(r.tool), narration: String(r.narration), props: json(r.props, {}) });

const toProject = (r: Row, scenes: Scene[]): Project => ({
  id: String(r.id),
  channelId: String(r.channel_id),
  skillId: String(r.skill_id),
  idea: String(r.idea),
  title: String(r.title),
  status: String(r.status) as Project['status'],
  formats: json<Format[]>(r.formats, ['landscape']),
  voice: String(r.voice) as Project['voice'],
  music: Boolean(r.music),
  sceneCount: r.scene_count === null || r.scene_count === undefined ? null : Number(r.scene_count),
  scenes,
  publish: json(r.publish, null),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toRender = (r: Row): Render => ({
  id: String(r.id),
  projectId: String(r.project_id),
  format: String(r.format) as Format,
  filePath: String(r.file_path),
  durationSec: Number(r.duration_sec),
  createdAt: String(r.created_at),
});

const scenesOf = (projectId: string) =>
  (db().prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY position').all(projectId) as Row[]).map(toScene);

export const projectRepository = {
  list(): Project[] {
    const rows = db().prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Row[];
    return rows.map((r) => toProject(r, scenesOf(String(r.id))));
  },
  find(id: string): Project | null {
    const r = db().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Row | undefined;
    return r ? toProject(r, scenesOf(id)) : null;
  },
  insert(p: Omit<Project, 'scenes' | 'publish' | 'title'>) {
    db()
      .prepare(
        `INSERT INTO projects (id, channel_id, skill_id, idea, title, status, formats, voice, music, scene_count, publish, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(p.id, p.channelId, p.skillId, p.idea, p.status, JSON.stringify(p.formats), p.voice, p.music ? 1 : 0, p.sceneCount, p.createdAt, p.updatedAt);
  },
  update(id: string, patch: Partial<Pick<Project, 'title' | 'status' | 'scenes' | 'publish' | 'formats' | 'voice' | 'music'>>) {
    transaction(() => {
      const sets: string[] = [];
      const values: (string | number | null)[] = [];
      const set = (col: string, v: string | number | null) => {
        sets.push(`${col} = ?`);
        values.push(v);
      };
      if (patch.title !== undefined) set('title', patch.title);
      if (patch.status !== undefined) set('status', patch.status);
      if (patch.publish !== undefined) set('publish', patch.publish === null ? null : JSON.stringify(patch.publish));
      if (patch.formats !== undefined) set('formats', JSON.stringify(patch.formats));
      if (patch.voice !== undefined) set('voice', patch.voice);
      if (patch.music !== undefined) set('music', patch.music ? 1 : 0);
      set('updated_at', now());
      db().prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
      if (patch.scenes) {
        db().prepare('DELETE FROM scenes WHERE project_id = ?').run(id);
        const ins = db().prepare('INSERT INTO scenes (id, project_id, position, tool, narration, props) VALUES (?, ?, ?, ?, ?, ?)');
        patch.scenes.forEach((s, i) => ins.run(s.id, id, i, s.tool, s.narration, JSON.stringify(s.props)));
      }
    });
  },
  touch(id: string) {
    db().prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), id);
  },
  remove(id: string) {
    db().prepare('DELETE FROM projects WHERE id = ?').run(id);
  },
  renders(projectId: string): Render[] {
    return (db().prepare('SELECT * FROM renders WHERE project_id = ? ORDER BY format').all(projectId) as Row[]).map(toRender);
  },
  replaceRenders(projectId: string, renders: Omit<Render, 'id' | 'projectId' | 'createdAt'>[]): Render[] {
    transaction(() => {
      db().prepare('DELETE FROM renders WHERE project_id = ?').run(projectId);
      const ins = db().prepare('INSERT INTO renders (id, project_id, format, file_path, duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of renders) ins.run(newId(), projectId, r.format, r.filePath, r.durationSec, now());
    });
    return projectRepository.renders(projectId);
  },
  events(projectId: string): ProjectEvent[] {
    return db().prepare('SELECT at, message FROM project_events WHERE project_id = ? ORDER BY id').all(projectId) as unknown as ProjectEvent[];
  },
  addEvent(projectId: string, message: string) {
    db().prepare('INSERT INTO project_events (project_id, at, message) VALUES (?, ?, ?)').run(projectId, now(), message);
    projectRepository.touch(projectId);
  },
};
