#!/usr/bin/env node
// Checks the feature dossiers in docs/features (see docs/features/README.md). No dependencies.
// Exit 1 with one line per problem. Run by CI and by /check.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../docs/features');
const STATUSES = ['draft', 'approved', 'building', 'delivered', 'dropped'];
const SPEC_KEYS = ['id', 'title', 'status', 'owner', 'size', 'touches', 'created'];
const ORDER = { draft: 0, approved: 1, building: 2, delivered: 3, dropped: -1 };

/** Reads the `key: value` lines of a leading --- block. Values stay raw strings. */
function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_]+):\s*(.*?)\s*(?:#.*)?$/.exec(line);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

const problems = [];
const fail = (dir, msg) => problems.push(`docs/features/${dir}: ${msg}`);

const dirs = fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')) : [];
const seen = new Map();

for (const { name } of dirs) {
  const m = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(name);
  if (!m) {
    fail(name, 'folder must be NNNN-slug (four digits, lowercase words joined by -)');
    continue;
  }
  if (seen.has(m[1])) fail(name, `number ${m[1]} is already used by ${seen.get(m[1])}`);
  seen.set(m[1], name);

  const dir = path.join(root, name);
  const specFile = path.join(dir, 'spec.md');
  if (!fs.existsSync(specFile)) {
    fail(name, 'spec.md is missing');
    continue;
  }
  const spec = frontmatter(specFile);
  if (!spec) {
    fail(name, 'spec.md has no frontmatter');
    continue;
  }
  for (const key of SPEC_KEYS) if (!(key in spec) || spec[key] === '') fail(name, `spec.md frontmatter lacks "${key}"`);
  if (spec.id && spec.id !== m[1]) fail(name, `spec.md id ${spec.id} does not match the folder number ${m[1]}`);
  if (!STATUSES.includes(spec.status)) {
    fail(name, `spec.md status "${spec.status}" is not one of ${STATUSES.join(', ')}`);
    continue;
  }

  const rank = ORDER[spec.status];
  if (rank >= ORDER.building && !fs.existsSync(path.join(dir, 'plan.md'))) fail(name, `status ${spec.status} needs plan.md`);
  if (spec.status === 'delivered') {
    const reviewFile = path.join(dir, 'review.md');
    if (!fs.existsSync(reviewFile)) fail(name, 'status delivered needs review.md');
    else {
      const review = frontmatter(reviewFile);
      if (review?.verdict !== 'approved') fail(name, `review.md verdict is "${review?.verdict ?? 'missing'}", delivered needs "approved"`);
    }
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`dossiers ok (${dirs.length} checked)`);
