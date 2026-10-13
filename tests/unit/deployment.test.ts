import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyDeployment } from '../../scripts/lib/deployment.mjs';

function publishedSite(revision = 'commit-testado', corrupt = false, missing = false) {
  const files = {
    'index.html': '<html>Site testado</html>',
    'config.js': 'window.LINKS_ENABLED=true;'
  };
  const manifest = {
    revision,
    files: Object.entries(files).map(([path, bytes]) => ({
      path,
      sha256: createHash('sha256').update(bytes).digest('hex')
    }))
  };
  const requested: string[] = [];
  const fetchFile = async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    requested.push(url.href);
    const file = url.pathname.replace('/spider-guia/', '');
    if (file === 'deployment.json') return new Response(JSON.stringify(manifest));
    if (missing && file === 'config.js') return new Response('Não encontrado', { status: 404 });
    return new Response(
      corrupt && file === 'config.js' ? 'Outra versão' : files[file as keyof typeof files]
    );
  };
  return { fetchFile, requested };
}

describe('Verificação do build publicado', () => {
  it('confere todos os arquivos na subpasta e usa a revisão esperada', async () => {
    const site = publishedSite();
    expect(
      await verifyDeployment('https://example.org/spider-guia', 'commit-testado', site.fetchFile)
    ).toEqual({ fileCount: 2 });
    expect(site.requested).toHaveLength(3);
    expect(
      site.requested.every(
        (url) =>
          url.startsWith('https://example.org/spider-guia/') &&
          new URL(url).searchParams.get('revision') === 'commit-testado'
      )
    ).toBe(true);
  });
  it('rejeita uma versão anterior ainda servida pelo provedor', async () => {
    await expect(
      verifyDeployment(
        'https://example.org/spider-guia/',
        'commit-testado',
        publishedSite('commit-anterior').fetchFile
      )
    ).rejects.toThrow(/commit esperado/);
  });
  it('detecta arquivo com conteúdo diferente do manifesto', async () => {
    await expect(
      verifyDeployment(
        'https://example.org/spider-guia/',
        'commit-testado',
        publishedSite('commit-testado', true).fetchFile
      )
    ).rejects.toThrow(/config.js/);
  });
  it('não considera uma publicação com arquivo ausente como sucesso', async () => {
    await expect(
      verifyDeployment(
        'https://example.org/spider-guia/',
        'commit-testado',
        publishedSite('commit-testado', false, true).fetchFile
      )
    ).rejects.toThrow(/HTTP 404/);
  });
});
