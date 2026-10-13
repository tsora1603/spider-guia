import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'yaml';
import vite from '../vite.config.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = parse(fs.readFileSync('.github/workflows/quality.yml', 'utf8'));
const { quality, e2e, deploy } = workflow.jobs;
const command = (job, script) => job.steps.some((step) => step.run === `npm run ${script}`);
const action = (job, name) => job.steps.find((step) => step.uses?.startsWith(`actions/${name}@`));
assert.equal(vite.base, './', 'Assets precisam funcionar na subpasta do Pages.');
assert.equal(vite.build.outDir, 'dist');
assert.equal(fs.existsSync('netlify.toml'), false);
assert.deepEqual(workflow.permissions, { contents: 'read' });
for (const job of [quality, e2e, deploy]) {
  assert.equal(job['runs-on'], 'ubuntu-24.04');
  for (const step of job.steps.filter((step) => step.uses)) {
    assert.match(step.uses, /@[a-f0-9]{40}$/, 'Actions devem usar commits imutáveis.');
  }
}
for (const job of [quality, e2e]) {
  assert.equal(action(job, 'setup-node').with['node-version'], '24');
  assert.equal(job.permissions?.pages, undefined);
}
assert.ok(
  command(quality, 'data:generated:check'),
  'CI deve detectar artefatos gerados desatualizados.'
);
assert.ok(command(quality, 'e:check'));
assert.ok(
  quality.steps.some((step) => step.run === 'npm run reset:local-smoke && npm run reset:smoke')
);
assert.equal(e2e.needs, 'quality');
assert.ok(command(e2e, 'test:e2e') && command(e2e, 'test:pages'));
assert.equal(action(e2e, 'upload-pages-artifact').with.path, 'dist');
assert.deepEqual(deploy.needs, ['quality', 'e2e']);
assert.equal(deploy.if, "github.ref == 'refs/heads/main' && github.event_name != 'pull_request'");
assert.deepEqual(deploy.permissions, { contents: 'read', pages: 'write', 'id-token': 'write' });
assert.equal(deploy.environment.name, 'github-pages');
assert.deepEqual(deploy.concurrency, { group: 'github-pages', 'cancel-in-progress': false });
assert.ok(action(deploy, 'configure-pages') && action(deploy, 'deploy-pages'));
assert.ok(
  deploy.steps.some((step) =>
    step.run?.startsWith('node --use-env-proxy scripts/verify-deployment.mjs ')
  ),
  'Deploy deve verificar o site público e seus hashes.'
);
assert.ok(pkg.scripts.build.endsWith('node scripts/build-deployment-manifest.mjs'));
console.log(
  'CI: dados reproduzíveis, build testado, permissões restritas e publicação verificada.'
);
