import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(
  await fs.readFile(path.join(ROOT, 'tests', 'fixtures', 'progress-v1-example.json'), 'utf8')
);
const oldProgress = structuredClone(fixture['aranha-progress-v1'] || {});
const oldLog = structuredClone(fixture['aranha-log-v1'] || {});

// Espelha a migração v0 -> v2 de src/state/storage-migrations.ts.
const progress = Object.fromEntries(
  Object.entries(oldProgress).filter(([, status]) => status === 'Sim' || status === 'Pulei')
);
const meta = Object.fromEntries(
  Object.entries(progress).map(([id, status]) => [id, { status, updatedAt: 0 }])
);
const log = Object.fromEntries(
  Object.entries(oldLog)
    .map(([id, value]) => [id, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value >= 0)
);

const changedValues = Object.keys(oldProgress).filter(id => oldProgress[id] !== progress[id]);
const droppedIds = Object.keys(oldProgress).filter(id => !(id in progress));
const logChanged = JSON.stringify(oldLog) !== JSON.stringify(log);
const ok = changedValues.length === 0 && droppedIds.length === 0 && !logChanged;

console.log(JSON.stringify({
  ok,
  fromVersion: 0,
  toVersion: 2,
  keysPreserved: ['aranha-progress-v1', 'aranha-log-v1', 'aranha-progress-meta-v2', 'aranha-sync-queue-v1'],
  changedValues: changedValues.length,
  droppedIds,
  generatedMetaRecords: Object.keys(meta).length,
  logChanged
}, null, 2));

if (!ok) process.exitCode = 1;
