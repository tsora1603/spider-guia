import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { findUnprotectedRevelations } from '../../scripts/lib/spoiler-policy.mjs';
import {
  joinSpoilerText,
  spoilerAccessibleText,
  spoilerIsVisible,
  spoilerParts,
  spoilerPlainText
} from '../../src/spoilers/model';
import { milestoneAnchorKey } from '../../src/views/explore-navigation';
import { milestones, loadPhaseReadings, catalogChunks } from '../../src/data/model';

describe('curadoria rigorosa de spoilers', () => {
  it('protege revelações revisadas em todos os dados exibidos, inclusive títulos e referências', async () => {
    expect(await findUnprotectedRevelations(process.cwd())).toEqual([]);
  });

  it.each([
    'Harry Osborn vira Duende Verde',
    'A morte de Gwen Stacy',
    'A Morte de Jean DeWolff',
    'A Tia May está viva'
  ])('oculta %s em Nenhum e Leve, preservando busca e âncoras', (title) => {
    const milestone = milestones.find((entry) => spoilerPlainText(entry.title) === title)!;
    expect(milestone).toBeTruthy();
    expect(spoilerParts(milestone.title).every((part) => part.spoiler === 'forte')).toBe(true);
    for (const level of ['nenhum', 'leve'] as const) {
      expect(spoilerAccessibleText(milestone.title, level)).not.toContain(title);
      expect(spoilerIsVisible('forte', level)).toBe(false);
    }
    expect(spoilerAccessibleText(milestone.title, 'tudo')).toBe(title);
    expect(milestoneAnchorKey(milestone)).toBe(milestoneAnchorKey({ ...milestone, title }));
  });

  it('mantém marcações das instruções ao carregar e concatenar detalhes da Checklist', async () => {
    const chunk = catalogChunks.find((entry) => entry.itemIds.includes(63))!;
    const readings = await loadPhaseReadings(chunk.phase);
    const item = readings.get(63)!;
    const text = joinSpoilerText([item.notes, item.extraNote]);
    expect(spoilerAccessibleText(text, 'nenhum')).not.toContain('agentes duplos');
    expect(spoilerPlainText(text)).toContain('agentes duplos');
    expect(spoilerPlainText(text)).toContain('Como encaixar');
  });

  it('marca apenas a revelação do título bibliográfico e mantém a referência visível', () => {
    const extras = JSON.parse(readFileSync('data/src/editorial/extras.json', 'utf8'));
    const extra = extras.find((entry: any) =>
      spoilerPlainText(entry.name).includes('Jean DeWolff')
    );
    expect(spoilerAccessibleText(extra.name, 'leve')).toContain('#107–110');
    expect(spoilerAccessibleText(extra.name, 'leve')).not.toContain('Morte');
    expect(spoilerPlainText(extra.name)).toContain('A Morte de Jean DeWolff');
  });
});
