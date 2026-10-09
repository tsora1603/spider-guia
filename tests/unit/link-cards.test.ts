import { describe, expect, it } from 'vitest';
import { createEditorialLinkCards, destinationActionLabel } from '../../src/views/link-card-model';
import type { EditorialLinkGroup } from '../../src/links/types';
import { extraAnchorKey } from '../../src/views/explore-navigation';

const extras = [
  { n: 8, name: 'Saga A', itemIds: [1, 2], after: 3 },
  { n: 9, name: 'Annual isolado', itemIds: [3], after: 4 }
];
const model = {
  formatCoverage: (coverages: EditorialLinkGroup['coverage']) =>
    (coverages || [])
      .map((c) =>
        c.type === 'one-shot'
          ? c.series
          : c.type === 'lgy'
            ? `LGY #${c.ranges[0].start}–${c.ranges[0].end}`
            : `${c.series} #${c.ranges[0].start}–${c.ranges[0].end}`
      )
      .join(' · '),
  resolveExtraId: (group: EditorialLinkGroup, destination?: EditorialLinkGroup['links'][number]) =>
    destination && Object.prototype.hasOwnProperty.call(destination, 'extraId')
      ? (destination.extraId ?? null)
      : (group.extraId ?? null)
};

const group: EditorialLinkGroup = {
  id: 'saga-a',
  title: 'Saga A',
  extraId: 8,
  itemIds: [1, 2],
  coverage: [{ type: 'lgy', ranges: [{ start: 40, end: 45 }] }],
  notes: 'Leia depois da edição X',
  links: [
    { label: 'Link [Google Drive]', url: 'https://drive.google.com/a' },
    {
      label: 'Annual no Mediafire',
      url: 'https://mediafire.com/b',
      extraId: 9,
      coverage: [{ type: 'one-shot', series: 'Annual #20' }]
    },
    { label: 'Material independente', url: 'https://example.org/c', extraId: null }
  ]
};

describe('Explorar → Links: projeção editorial para cards diretos', () => {
  it('mantém IDs, ordem e URLs, apresentando cobertura específica sem repetir a comum', () => {
    const cards = createEditorialLinkCards([group], extras, model, {
      1: { series: 'ASM', issue: '#1' },
      2: { series: 'ASM', issue: '#2' }
    });
    expect(cards).toHaveLength(1);
    expect(cards[0].key).toBe('saga-a');
    expect(cards[0].coverageLabel).toBe('');
    expect(cards[0].destinations.map((dest) => dest.url)).toEqual(
      group.links.map((dest) => dest.url)
    );
    expect(cards[0].destinations.map((dest) => dest.coverageLabel)).toEqual([
      'LGY #40–45',
      'Annual #20',
      'LGY #40–45'
    ]);
    expect(cards[0].searchText).toContain('asm #1');
    expect(cards[0].searchText).not.toContain('encadernado nacional');
  });

  it('resolve associações explicitamente por destino, respeitando null e IDs inválidos', () => {
    const destinations = createEditorialLinkCards([group], extras, model, {})[0].destinations;
    expect(destinations.map((dest) => dest.extraTarget)).toEqual([
      extraAnchorKey(extras[0]),
      extraAnchorKey(extras[1]),
      null
    ]);
    const invalid = createEditorialLinkCards(
      [{ ...group, extraId: 999, links: [group.links[0]] }],
      extras,
      model,
      {}
    );
    expect(invalid[0].destinations[0].extraTarget).toBeNull();
  });

  it('permite novas entradas sem itemIds nem ficha de Extras', () => {
    const card = createEditorialLinkCards(
      [
        {
          id: 'novo',
          title: 'Nova série',
          coverage: [{ type: 'one-shot', series: 'Especial' }],
          links: [{ label: 'Ler', url: 'https://example.com' }]
        }
      ],
      extras,
      model,
      {}
    )[0];
    expect(card.coverageLabel).toBe('Especial');
    expect(card.destinations[0].extraTarget).toBeNull();
  });

  it('melhora rótulos genéricos sem alterar a fonte original', () => {
    expect(destinationActionLabel('Link [Google Drive]')).toBe('Google Drive');
    expect(destinationActionLabel('Guerras Secretas')).toBe('Guerras Secretas');
    expect(group.links[0].label).toBe('Link [Google Drive]');
  });
});
