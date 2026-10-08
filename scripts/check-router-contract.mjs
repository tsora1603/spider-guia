import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spider-router-'));

try {
  const compile = spawnSync(
    'tsc',
    [
      'src/router/router.ts',
      'src/state/app-state.ts',
      'src/state/types.ts',
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--target', 'ES2020',
      '--outDir', outDir,
      '--skipLibCheck',
      '--esModuleInterop'
    ],
    { cwd: ROOT, encoding: 'utf8' }
  );
  if (compile.status !== 0) {
    process.stderr.write(compile.stdout || '');
    process.stderr.write(compile.stderr || '');
    process.exit(compile.status || 1);
  }

  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  const require = createRequire(pathToFileURL(path.join(outDir, 'runner.cjs')));
  const { parseHash, routeToHash } = require(path.join(outDir, 'router', 'router.js'));

  const checklist = parseHash('#ler/checklist?f=pendentes&q=clone', true);
  const hq = parseHash('#hq/123', true);
  const unknown = parseHash('#nao-existe', true);
  const linksDisabled = parseHash('#links', false);

  const checks = {
    checklistDecodes: checklist.name === 'checklist' && checklist.checklistFilter === 'Não' && checklist.checklistQuery === 'clone',
    checklistRedirects: routeToHash(checklist) === '#checklist?f=pendentes&q=clone',
    hqDecodes: hq.name === 'hq' && hq.itemId === 123,
    hqRedirects: routeToHash(hq) === '#checklist/hq/123',
    unknownNormalizes: routeToHash(unknown) === '#hoje',
    linksFlagHonored: routeToHash(linksDisabled) === '#explorar/jornada'
  };
  const ok = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ ok, checks }, null, 2));
  if (!ok) process.exitCode = 1;
} finally {
  await fs.rm(outDir, { recursive: true, force: true });
}
