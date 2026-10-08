import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EXTRA_CONFIRMATION_POLICY,
  extraConfirmationPasses,
  validateExtraConfirmation
} from '../../data/extra-confirmation.mjs';

const readExtras = async () => JSON.parse(
  await readFile(path.join(process.cwd(), 'data/src/editorial/extras.json'), 'utf8')
);

describe('contrato de confirmação das Leituras Extras', () => {
  it('fixa a política em 100/0 para posição e 80/20 para peso', () => {
    expect(EXTRA_CONFIRMATION_POLICY).toEqual({
      position: { minimumEvidencePercent: 100, maximumDeductionPercent: 0 },
      weight: { minimumEvidencePercent: 80, maximumDeductionPercent: 20 }
    });
  });

  it('só marca Confirmado quando os dois gates passam', async () => {
    const extras = await readExtras();
    const confirmed = extras.filter((extra: any) => extra.confirmation === 'Confirmado');
    const bothPass = extras.filter((extra: any) => extraConfirmationPasses(extra));

    expect(extras).toHaveLength(108);
    expect(confirmed).toHaveLength(23);
    expect(bothPass).toHaveLength(23);
    for (const extra of extras) {
      expect(validateExtraConfirmation(extra).ok).toBe(true);
      expect(extra.confirmation === 'Confirmado').toBe(extraConfirmationPasses(extra));
    }
  });

  it('mantém Parcial quando só um critério passa', async () => {
    const extras = await readExtras();
    const positionOnly = extras.find((extra: any) =>
      extra.confirmationCriteria.position === 'source-only'
      && extra.confirmationCriteria.weight === 'not-met'
    );
    const weightOnly = extras.find((extra: any) =>
      extra.confirmationCriteria.position === 'not-met'
      && extra.confirmationCriteria.weight === 'evidence-led-80-20'
    );

    expect(positionOnly?.confirmation).toBe('Parcial');
    expect(weightOnly?.confirmation).toBe('Parcial');
  });
});
