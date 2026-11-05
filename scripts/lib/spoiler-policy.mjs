import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Editorial regression guard. Never imported by the site: rendering uses only data annotations.
export async function findUnprotectedRevelations(root) {
  const policy = JSON.parse(
    await readFile(path.join(root, 'data/review/spoiler-policy.json'), 'utf8')
  );
  const phrases = policy.strongRevelations.map((text) => text.toLocaleLowerCase('pt-BR'));
  const failures = [];
  function inspect(value, pointer) {
    if (typeof value === 'string') {
      if (phrases.some((phrase) => value.toLocaleLowerCase('pt-BR').includes(phrase)))
        failures.push(pointer);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${pointer}/${index}`));
    } else if (value && typeof value === 'object') {
      if (value.spoiler === 'forte' && typeof value.text === 'string') return;
      for (const [key, item] of Object.entries(value)) inspect(item, `${pointer}/${key}`);
    }
  }
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(file);
      // Research evidence is not shipped to the UI.
      else if (entry.name.endsWith('.json') && entry.name !== 'publication-evidence.json') {
        inspect(JSON.parse(await readFile(file, 'utf8')), path.relative(root, file));
      }
    }
  }
  await scan(path.join(root, 'data/src'));
  return failures;
}
