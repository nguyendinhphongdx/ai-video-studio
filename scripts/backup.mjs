// Backs up everything the app keeps: the SQLite database (a consistent copy while the app runs), the shared AI keys and
// the media files. Usage, from the server:  docker compose exec web node scripts/backup.mjs
// Writes data/backups/<UTC time>/ {app.db, settings.json, media.tar.gz} and keeps the newest KEEP backups.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA = path.resolve(process.env.AVS_DATA_DIR || 'data');
const KEEP = Number(process.env.AVS_BACKUP_KEEP || 7);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(DATA, 'backups', stamp);
fs.mkdirSync(out, { recursive: true });

// VACUUM INTO writes a consistent, compacted copy even while the web app and the worker are writing.
const db = new DatabaseSync(path.join(DATA, 'app.db'));
db.exec(`VACUUM INTO '${path.join(out, 'app.db').replaceAll("'", "''")}'`);
db.close();

if (fs.existsSync(path.join(DATA, 'settings.json'))) fs.copyFileSync(path.join(DATA, 'settings.json'), path.join(out, 'settings.json'));
fs.chmodSync(out, 0o700);
if (fs.existsSync(path.join(DATA, 'media'))) execFileSync('tar', ['-czf', path.join(out, 'media.tar.gz'), '-C', DATA, 'media']);

const all = fs.readdirSync(path.join(DATA, 'backups')).sort();
for (const old of all.slice(0, Math.max(0, all.length - KEEP))) fs.rmSync(path.join(DATA, 'backups', old), { recursive: true, force: true });

const size = (f) => (fs.existsSync(f) ? `${(fs.statSync(f).size / 1e6).toFixed(1)} MB` : '-');
console.log(`backup ${out}\n  app.db ${size(path.join(out, 'app.db'))}\n  media.tar.gz ${size(path.join(out, 'media.tar.gz'))}`);
