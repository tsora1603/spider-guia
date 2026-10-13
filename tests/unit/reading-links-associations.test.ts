import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createLinkAssociations,
  linkTargetsFor,
  linkTargetsForCloneArc,
  linkTargetsForItems
} from '../../src/links/associations';
import { contextualLinksTarget, resolveLinkTargets } from '../../src/views/explore-navigation';
import type { EditorialLinkGroup } from '../../src/links/types';

const known = [1, 2, 3, 4].map((id) => ({ id, historicalNumber: id, type: 'Principal' }));
const extras = [
  { n: 10, itemIds: [1, 2] },
  { n: 11, itemIds: [3] }
];
const sample: EditorialLinkGroup[] = [
  {
    id: 'alpha',
    title: 'Alpha',
    targets: [
      { kind: 'items', ids: [1, 2] },
      { kind: 'extra', id: 10 },
      { kind: 'extra', id: 11 },
      { kind: 'cloneArc', id: 'arc-a' }
    ],
    links: [
      { label: 'A', url: 'https://example.com/a' },
      { label: 'B', url: 'https://example.com/b', extraTarget: 11 },
      { label: 'C', url: 'https://example.com/c', extraTarget: null }
    ]
  },
  {
    id: 'beta',
    title: 'Beta',
    targets: [
      { kind: 'items', ids: [2, 3] },
      { kind: 'extra', id: 10 }
    ],
    links: [{ label: 'D', url: 'https://example.com/d' }]
  },
  {
    id: 'coverage-only',
    title: 'LGY #1–700',
    coverage: [{ type: 'lgy', ranges: [{ start: 1, end: 700 }] }],
    links: [{ label: 'E', url: 'https://example.com/e' }]
  }
];

describe('Ações contextuais — índice de Links explícitos', () => {
  it('o botão do grupo reúne somente vínculos das edições, sem repetir destinos', () => {
    const index = createLinkAssociations(sample, known, extras, new Set(['arc-a']));
    expect(linkTargetsForItems(index, [1, 2, 3, 4])).toEqual(['alpha', 'beta']);
    expect(linkTargetsForItems(index, [4])).toEqual([]);
    expect(linkTargetsForItems(index, [])).toEqual([]);
  });
  it('indexa somente targets cadastrados; coverage jamais gera vínculos de HQ', () => {
    const index = createLinkAssociations(sample, known, extras, new Set(['arc-a']));
    expect(linkTargetsFor(index, 'item', 1)).toEqual(['alpha', 'beta']);
    expect(linkTargetsFor(index, 'item', 2)).toEqual(['alpha', 'beta']);
    expect(linkTargetsFor(index, 'item', 3)).toEqual(['alpha', 'beta']);
    expect(linkTargetsFor(index, 'item', 4)).toEqual([]);
    expect(index.byItemId.size).toBe(3);
    expect(index.byItemId.get(700)).toBeUndefined();
  });

  it('liga conjuntos Extras pelos targets explícitos', () => {
    const index = createLinkAssociations(sample, known, extras, new Set(['arc-a']));
    expect(linkTargetsFor(index, 'extra', 10)).toEqual(['alpha', 'beta']);
    expect(linkTargetsFor(index, 'extra', 11)).toEqual(['alpha']);
  });

  it('extraTarget de destino não cria associações; título e coverage também não', () => {
    const index = createLinkAssociations(
      [
        {
          ...sample[0],
          id: 'null-only',
          targets: [{ kind: 'items', ids: [1] }],
          links: [{ label: 'Sem extra', url: 'https://example.com', extraTarget: 11 }]
        },
        { ...sample[2], id: 'coverage' }
      ],
      known,
      extras
    );
    expect(index.byExtraId.size).toBe(0);
    expect(index.byItemId.get(1)).toEqual(['null-only']);
  });

  it('ignora destinos HTTP(S) inválidos, IDs desconhecidos e grupos duplicados', () => {
    const index = createLinkAssociations(
      [
        {
          ...sample[0],
          targets: [
            { kind: 'items', ids: [1, 9999] },
            { kind: 'extra', id: 9999 }
          ],
          links: [{ label: 'Inválido', url: 'javascript:alert(1)' }]
        },
        {
          ...sample[0],
          targets: [{ kind: 'items', ids: [1, 9999] }],
          links: [{ label: 'Válido', url: 'https://example.com' }]
        },
        {
          ...sample[0],
          id: 'valid',
          targets: [{ kind: 'items', ids: [1, 9999] }],
          links: [{ label: 'Válido', url: 'https://example.com' }]
        }
      ],
      known,
      extras
    );
    expect(index.byItemId.get(1)).toEqual(['valid']);
    expect(index.byItemId.get(9999)).toBeUndefined();
  });

  it('permite deep link para vários cards e URL de retorno após recarregar', () => {
    const hash = contextualLinksTarget(
      ['alpha', 'beta', 'alpha'],
      '#checklist/hq/2?f=pendentes&q=annual'
    );
    const params = new URLSearchParams(hash.split('?')[1]);
    expect(hash.startsWith('#explorar/links?')).toBe(true);
    expect(params.getAll('link')).toEqual(['alpha', 'beta']);
    expect(params.get('from')).toBe('#checklist/hq/2?f=pendentes&q=annual');
    expect(resolveLinkTargets(params.getAll('link'), ['alpha', 'beta', 'z'])).toEqual([
      'alpha',
      'beta'
    ]);
  });

  it('mantém os links simples e o fallback por índice sem confundir IDs numéricos', () => {
    expect(resolveLinkTargets(['1'], ['alpha', '1', 'beta'])).toEqual(['1']);
    expect(resolveLinkTargets(['0', 'beta', 'não-existe'], ['alpha', 'beta'])).toEqual([
      'alpha',
      'beta'
    ]);
    expect(contextualLinksTarget(['alpha'], 'https://other.example/')).toBe(
      '#explorar/links?link=alpha'
    );
    expect(contextualLinksTarget(['alpha'], '#explorar/clone')).toBe(
      '#explorar/links?link=alpha&from=%23explorar%2Fclone'
    );
  });

  it('vincula explicitamente a linha principal à cobertura cadastrada, sem incluir anuais', () => {
    const groups = JSON.parse(
      readFileSync('data/src/editorial/links.json', 'utf8')
    ) as EditorialLinkGroup[];
    const editorial = JSON.parse(readFileSync('data/src/editorial/extras.json', 'utf8')) as {
      n: number;
      itemIds?: number[];
    }[];
    const catalog = JSON.parse(readFileSync('src/data/generated-index.json', 'utf8')) as {
      itemIndexFields: string[];
      itemIndex: unknown[][];
    };
    const idIndex = catalog.itemIndexFields.indexOf('id');
    const numberIndex = catalog.itemIndexFields.indexOf('historicalNumber');
    const typeIndex = catalog.itemIndexFields.indexOf('type');
    const indexedItems = catalog.itemIndex.map((row) => ({
      id: Number(row[idIndex]),
      historicalNumber: row[numberIndex] == null ? null : Number(row[numberIndex]),
      type: String(row[typeIndex])
    }));
    const clone = JSON.parse(readFileSync('data/src/editorial/clone.json', 'utf8')) as {
      entries: Array<{ arcId: string }>;
    };
    const index = createLinkAssociations(
      groups,
      indexedItems,
      editorial,
      new Set(clone.entries.map((entry) => entry.arcId))
    );
    const originalGroups = JSON.parse(
      readFileSync('data/snapshots/editorial-links-baseline.json', 'utf8')
    ) as { id: string }[];
    expect(groups.map((group) => group.id)).toEqual(
      expect.arrayContaining(originalGroups.map((group) => group.id))
    );
    expect(index.byExtraId.size).toBeGreaterThan(20);
    expect(index.byItemId.get(2)).toEqual(['spider-man-1963']);
    expect(groups[0].targets).toContainEqual({
      kind: 'historical',
      ranges: [{ start: 1, end: 700 }]
    });
    expect(index.byItemId.get(1)).toBeUndefined(); // Amazing Fantasy ainda não tem destino cadastrado.
    expect(index.byItemId.get(1227)).toBeUndefined(); // Annual #1 não herda o link da série principal.
    for (const row of catalog.itemIndex.filter((row) => row[numberIndex] != null)) {
      const number = Number(row[numberIndex]);
      if (number <= 964) expect(index.byItemId.has(Number(row[idIndex]))).toBe(true);
    }
    const seriesIndex = catalog.itemIndexFields.indexOf('series');
    const issueIndex = catalog.itemIndexFields.indexOf('issue');
    for (const row of catalog.itemIndex.filter(
      (row) => row[seriesIndex] === 'The Amazing Spider-Man (2025)'
    )) {
      expect(linkTargetsFor(index, 'item', Number(row[idIndex]))).toEqual(
        String(row[issueIndex]).replace(/^#/, '') === '29' ? ['spider-man-2025'] : []
      );
    }
    expect(index.byItemId.get(259)).toContain('leitura-5');
    expect(index.byExtraId.get(38)).toContain('leitura-5');
    expect(linkTargetsForCloneArc(index, 'power-and-responsibility-the-double')).toEqual([
      'spider-man-1963'
    ]);
    for (const entry of index.byItemId.values())
      for (const id of entry) expect(groups.some((group) => group.id === id)).toBe(true);
  });
});

describe('Retorno à leitura sem perder contexto', () => {
  it('restaura somente a entrada original do histórico, ignorando outras rotas', async () => {
    const { readingReturnFor } = await import('../../src/links/return-context');
    const state = {
      spiderReadingReturn: { kind: 'item', id: 256, hash: '#checklist?f=pendentes' }
    };
    expect(readingReturnFor(state, '#checklist?f=pendentes', 'item')).toBe(256);
    expect(readingReturnFor(state, '#checklist?f=lidas', 'item')).toBeNull();
    expect(readingReturnFor(state, '#checklist?f=pendentes', 'extra')).toBeNull();
    expect(
      readingReturnFor(
        { spiderReadingReturn: { kind: 'item', id: 0, hash: '#checklist' } },
        '#checklist',
        'item'
      )
    ).toBeNull();
  });
});

describe('Captura da origem no histórico', () => {
  it('grava apenas o contexto de UI e preserva history.state existente', async () => {
    const { rememberReadingReturn, readingReturnFor } =
      await import('../../src/links/return-context');
    const replaceState = vi.fn();
    vi.stubGlobal('history', { state: { origin: 'preserved' }, replaceState });
    vi.stubGlobal('location', {
      hash: '#checklist?f=pendentes',
      href: 'http://localhost/#checklist?f=pendentes'
    });
    try {
      rememberReadingReturn('item', 256);
      expect(replaceState).toHaveBeenCalledOnce();
      const [state, , href] = replaceState.mock.calls[0];
      expect(state.origin).toBe('preserved');
      expect(href).toBe('http://localhost/#checklist?f=pendentes');
      expect(readingReturnFor(state, '#checklist?f=pendentes', 'item')).toBe(256);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
