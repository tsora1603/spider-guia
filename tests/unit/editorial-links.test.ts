import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as model from '../../data/link-model.mjs';

interface IssueRange {
  start: number;
  end: number;
}
type Coverage =
  | { type: 'lgy'; ranges: IssueRange[] }
  | { type: 'series'; series: string; volume?: string; ranges: IssueRange[]; suffix?: string }
  | { type: 'one-shot'; series: string; volume?: string };
type Group = {
  id: string;
  title: string;
  links: Array<{ label: string; url: string; coverage?: Coverage[]; extraId?: number | null }>;
  itemIds?: number[];
  coverage?: Coverage[];
  extraId?: number;
  readingGroup?: number;
};
type LinkModel = {
  formatCoverage(coverage: Coverage[]): string;
  resolveExtraId(group: Group, destination?: Group['links'][number]): number | null;
  validateEditorialLinks(
    groups: Group[],
    options?: {
      knownItemIds?: Set<number>;
      extras?: Array<{ n: number; readingGroup?: number; itemIds: number[] }>;
    }
  ): Array<{ code: string; message: string }>;
};

function loadModel() {
  return {
    groups: JSON.parse(readFileSync(resolve('data/src/editorial/links.json'), 'utf8')) as Group[],
    model: model as LinkModel
  };
}

const fakeItemIds = new Set(Array.from({ length: 1301 }, (_, i) => i + 1));
const fakeExtras = [{ n: 30, readingGroup: 5, itemIds: [256, 257, 258] }];

const example = (): Group => ({
  id: 'novo-exemplo',
  title: 'Exemplo de múltiplas séries',
  coverage: [
    {
      type: 'lgy',
      ranges: [
        { start: 30, end: 42 },
        { start: 50, end: 55 }
      ]
    },
    { type: 'series', series: 'Série A', volume: '2025', ranges: [{ start: 1, end: 7 }] }
  ],
  links: [
    { label: 'A', url: 'https://example.com/a' },
    {
      label: 'B',
      url: 'https://example.com/b',
      coverage: [{ type: 'series', series: 'Série B', ranges: [{ start: 0, end: 3 }] }]
    }
  ]
});

const errorsFor = (group: Group) => {
  const { model } = loadModel();
  return model
    .validateEditorialLinks([group], { knownItemIds: fakeItemIds, extras: fakeExtras })
    .map((error) => error.code);
};

describe('Links editoriais — cobertura e associações explícitas', () => {
  it('preserva o registro original válido com itemIds opcionais', () => {
    const { model, groups } = loadModel();
    expect(groups).toHaveLength(34);
    expect(groups.filter((group) => group.coverage)).toHaveLength(29);
    expect(groups.find((group) => group.id === 'leitura-5')).toMatchObject({
      itemIds: [256, 257, 258, 259],
      extraId: 30
    });
    const sourceExtraGroups = JSON.parse(
      readFileSync(resolve('data/src/editorial/extras.json'), 'utf8')
    );
    expect(
      model.validateEditorialLinks(groups, { knownItemIds: fakeItemIds, extras: sourceExtraGroups })
    ).toHaveLength(0);
  });

  it('permite cadastro sem centenas de IDs e destinos com coberturas distintas', () => {
    const model = loadModel().model;
    expect(errorsFor(example())).toEqual([]);
    const coverage = example().coverage!;
    expect(model.formatCoverage(coverage)).toContain('LGY #30–42, #50–55');
    expect(model.formatCoverage(coverage)).toContain('Série A (2025) #1–7');
    expect(model.formatCoverage([{ type: 'one-shot', series: 'Edição Especial' }])).toBe(
      'Edição Especial — edição única'
    );
    expect(
      model.formatCoverage([
        { type: 'series', series: 'Série X', suffix: 'LR', ranges: [{ start: 50, end: 54 }] }
      ])
    ).toBe('Série X #50.LR–54.LR');
  });

  it('rejeita falta de coverage quando itemIds não são fornecidos', () => {
    const group = example();
    delete group.coverage;
    expect(errorsFor(group)).toContain('links.association');
  });

  it('rejeita ID de grupo duplicado, itemIds duplicados e IDs inexistentes', () => {
    const { model } = loadModel();
    const group = { ...example(), itemIds: [256, 256, 9999] };
    const errors = model.validateEditorialLinks([group, structuredClone(group)], {
      knownItemIds: fakeItemIds
    });
    const codes = errors.map((error) => error.code);
    expect(codes).toContain('links.id.duplicate');
    expect(codes).toContain('links.item.duplicate');
    expect(codes).toContain('links.item');
  });

  it('rejeita ranges malformados, duplicados ou sobrepostos', () => {
    for (const ranges of [
      [{ start: 5, end: 4 }],
      [{ start: -1, end: 2 }],
      [{ start: 0.5, end: 1 }],
      [
        { start: 2, end: 5 },
        { start: 5, end: 7 }
      ]
    ]) {
      const group = example();
      group.coverage = [{ type: 'lgy', ranges }];
      expect(errorsFor(group).some((code) => code.startsWith('links.coverage'))).toBe(true);
    }
  });

  it('rejeita URLs inválidas e repetidas dentro do grupo, inclusive entre categorias', () => {
    const group = example();
    group.links.push(
      { label: 'Duplicado', url: 'https://example.com/a' },
      { label: 'Inseguro', url: 'javascript:alert(1)' }
    );
    expect(errorsFor(group)).toContain('links.url.duplicate');
    expect(errorsFor(group)).toContain('links.url');
  });

  it('rejeita referência a Extra inexistente e divergência de readingGroup', () => {
    const group = { ...example(), itemIds: [256], extraId: 30, readingGroup: 12 };
    expect(errorsFor(group)).toContain('links.extra');
    group.readingGroup = 5;
    expect(errorsFor(group)).toEqual([]);
    group.extraId = 999;
    expect(errorsFor(group)).toContain('links.extra');
    delete group.extraId;
    expect(errorsFor(group)).toContain('links.extra');
  });
});
