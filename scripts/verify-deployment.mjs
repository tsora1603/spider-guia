import assert from 'node:assert/strict';
import { verifyDeployment } from './lib/deployment.mjs';

const url = process.argv[2];
const revision = process.argv[3] || process.env.GITHUB_SHA;
let passed = false;
for (let attempt = 1; attempt <= 6; attempt++) {
  try {
    const result = await verifyDeployment(url, revision);
    console.log(`Publicação verificada: ${result.fileCount} arquivos do commit ${revision}.`);
    passed = true;
    break;
  } catch (error) {
    console.error(`Verificação ${attempt}/6: ${error.message}`);
    if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}
assert.ok(passed, 'Não foi possível confirmar a publicação do build testado.');
