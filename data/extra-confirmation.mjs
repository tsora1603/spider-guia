export const EXTRA_CONFIRMATION_POLICY = Object.freeze({
  position: Object.freeze({
    minimumEvidencePercent: 100,
    maximumDeductionPercent: 0
  }),
  weight: Object.freeze({
    minimumEvidencePercent: 60,
    maximumDeductionPercent: 40
  })
});

export const POSITION_CRITERIA = Object.freeze({
  PASS: 'source-only',
  FAIL: 'not-met'
});

export const WEIGHT_CRITERIA = Object.freeze({
  PASS: 'evidence-led-60-40',
  FAIL: 'not-met'
});

export function extraConfirmationPasses(extra) {
  return Boolean(
    extra?.confirmationCriteria?.position === POSITION_CRITERIA.PASS &&
    extra?.confirmationCriteria?.weight === WEIGHT_CRITERIA.PASS
  );
}

export function validateExtraConfirmation(extra) {
  const passes = extraConfirmationPasses(extra);
  const confirmed = extra?.confirmation === 'Confirmado';
  if (confirmed !== passes) {
    return {
      ok: false,
      message: confirmed
        ? 'Status Confirmado exige posição 100% baseada em fontes e peso dentro do critério 60/40.'
        : 'Os dois critérios foram aprovados; o status geral deve ser Confirmado.'
    };
  }
  return { ok: true, message: '' };
}
