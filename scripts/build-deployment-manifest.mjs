import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(file) : [file];
      })
    )
  ).flat();
}
const files = await Promise.all(
  (await walk('dist'))
    .filter((file) => file !== 'dist/deployment.json')
    .sort()
    .map(async (file) => ({
      path: path.relative('dist', file).split(path.sep).join('/'),
      sha256: createHash('sha256')
        .update(await fs.readFile(file))
        .digest('hex')
    }))
);
await fs.writeFile(
  'dist/deployment.json',
  JSON.stringify(
    {
      revision: process.env.GITHUB_SHA || null,
      files
    },
    null,
    2
  ) + '\n'
);
console.log(`Manifesto de publicação: ${files.length} arquivos.`);
