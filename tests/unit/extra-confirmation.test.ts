import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EXTRA_CONFIRMATION_POLICY,
  extraConfirmationPasses,
  validateExtraConfirmation
} from '../../data/extra-confirmation.mjs';

const readExtras = async () =>
  JSON.parse(await readFile(path.join(process.cwd(), 'data/src/editorial/extras.json'), 'utf8'));

describe('contrato de confirmação das Leituras Extras', () => {
  it('fixa a política em 100/0 para posição e 60/40 para peso', () => {
    expect(EXTRA_CONFIRMATION_POLICY).toEqual({
      position: { minimumEvidencePercent: 100, maximumDeductionPercent: 0 },
      weight: { minimumEvidencePercent: 60, maximumDeductionPercent: 40 }
    });
  });

  it('só marca Confirmado quando os dois gates passam', async () => {
    const extras = await readExtras();
    const confirmed = extras.filter((extra: any) => extra.confirmation === 'Confirmado');
    const bothPass = extras.filter((extra: any) => extraConfirmationPasses(extra));

    expect(extras.length).toBeGreaterThan(0);
    expect(confirmed.map((extra: { n: number }) => extra.n)).toEqual(
      bothPass.map((extra: { n: number }) => extra.n)
    );
    for (const extra of extras) {
      expect(validateExtraConfirmation(extra).ok).toBe(true);
      expect(extra.confirmation === 'Confirmado').toBe(extraConfirmationPasses(extra));
    }
  });

  it('reclassifica casos com suporte narrativo sem promover divergências de posição', async () => {
    const extras = await readExtras();
    for (const n of [3, 4, 5, 11, 30, 36, 62, 77, 79, 93]) {
      const extra = extras.find((item: any) => item.n === n);
      expect(extra.confirmation).toBe('Confirmado');
      expect(extra.confirmationCriteria.weight).toBe('evidence-led-60-40');
      expect(extra.confirmationNote).toContain('Dedução:');
      expect(extra.src.length).toBeGreaterThan(0);
    }
    for (const n of [6, 15, 38, 41, 80, 82, 90, 99]) {
      const extra = extras.find((item: any) => item.n === n);
      expect(extra.confirmation).toBe('Parcial');
    }
  });

  it('mantém Parcial quando só um critério passa', async () => {
    const extras = await readExtras();
    const positionOnly = extras.find(
      (extra: any) =>
        extra.confirmationCriteria.position === 'source-only' &&
        extra.confirmationCriteria.weight === 'not-met'
    );
    const weightOnly = extras.find(
      (extra: any) =>
        extra.confirmationCriteria.position === 'not-met' &&
        extra.confirmationCriteria.weight === 'evidence-led-60-40'
    );

    expect(positionOnly?.confirmation).toBe('Parcial');
    expect(weightOnly?.confirmation).toBe('Parcial');
  });
});
