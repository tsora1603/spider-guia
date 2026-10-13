import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export async function verifyDeployment(baseUrl, revision, fetchFile = fetch) {
  const base = new URL(baseUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  assert.ok(revision, 'Informe o commit esperado.');
  const download = async (file) => {
    const url = new URL(file, base);
    assert.ok(url.href.startsWith(base.href), `Caminho inválido no manifesto: ${file}`);
    url.searchParams.set('revision', revision);
    const response = await fetchFile(url, {
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store'
    });
    assert.ok(response.ok, `${url.pathname}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  };
  const manifest = JSON.parse((await download('deployment.json')).toString());
  assert.equal(
    manifest.revision,
    revision,
    'O servidor ainda não está oferecendo o commit esperado.'
  );
  assert.ok(
    Array.isArray(manifest.files) && manifest.files.some((file) => file.path === 'index.html'),
    'Manifesto incompleto.'
  );
  const queue = [...manifest.files];
  const results = await Promise.allSettled(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const file = queue.shift();
        const bytes = await download(file.path);
        assert.equal(
          createHash('sha256').update(bytes).digest('hex'),
          file.sha256,
          `${file.path}: conteúdo publicado difere do build testado.`
        );
      }
    })
  );
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) throw failure.reason;
  return { fileCount: manifest.files.length };
}
