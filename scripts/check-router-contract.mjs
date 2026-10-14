import ts from 'typescript';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'spider-router-'));

try {
  // typecheck valida o projeto inteiro; este contrato exercita as rotas no Node.
  // A API evita depender de flags de resolução legadas do CLI.
  for (const file of ['router/router.ts', 'state/app-state.ts', 'state/types.ts']) {
    const source = await fs.readFile(path.join(ROOT, 'src', file), 'utf8');
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    });
    const errors = (result.diagnostics || []).filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    if (errors.length)
      throw new Error(
        errors
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
          .join('\n')
      );
    const output = path.join(outDir, file.replace(/\.ts$/, '.js'));
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, result.outputText);
  }

  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  const require = createRequire(pathToFileURL(path.join(outDir, 'runner.cjs')));
  const { parseHash, routeToHash } = require(path.join(outDir, 'router', 'router.js'));

  const checklist = parseHash('#ler/checklist?f=pendentes&q=clone', true);
  const hq = parseHash('#hq/123', true);
  const unknown = parseHash('#nao-existe', true);
  const linksDisabled = parseHash('#links', false);

  const checks = {
    checklistDecodes:
      checklist.name === 'checklist' &&
      checklist.checklistFilter === 'Não' &&
      checklist.checklistQuery === 'clone',
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
