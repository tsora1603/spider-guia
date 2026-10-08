import fs from 'node:fs/promises';
import path from 'node:path';
import {
  EXTRA_CONFIRMATION_POLICY,
  POSITION_CRITERIA,
  WEIGHT_CRITERIA,
  extraConfirmationPasses,
  validateExtraConfirmation
} from '../data/extra-confirmation.mjs';

const root = process.cwd();
const extras = JSON.parse(await fs.readFile(path.join(root, 'data/src/editorial/extras.json'), 'utf8'));
const meta = JSON.parse(await fs.readFile(path.join(root, 'data/src/editorial/meta.json'), 'utf8'));
const generated = JSON.parse(await fs.readFile(path.join(root, 'src/data/generated-data.json'), 'utf8'));
const failures = [];
const fail = message => failures.push(message);

if (JSON.stringify(meta.extraConfirmationPolicy) !== JSON.stringify(EXTRA_CONFIRMATION_POLICY)) {
  fail('meta.json não corresponde à política canônica 100/0 para posição e 80/20 para peso.');
}

if (JSON.stringify(generated.editorial?.confirmationPolicy) !== JSON.stringify(EXTRA_CONFIRMATION_POLICY)) {
  fail('generated-data.json não publica a mesma política de confirmação do fonte canônico.');
}
const generatedByN = new Map((generated.editorial?.extras || []).map(extra => [extra.n, extra]));

for (const extra of extras) {
  const label = `Extra #${extra.n} — ${extra.name}`;
  const criteria = extra.confirmationCriteria;
  if (!criteria) {
    fail(`${label}: confirmationCriteria ausente.`);
    continue;
  }

  const positionPass = criteria.position === POSITION_CRITERIA.PASS;
  const weightPass = criteria.weight === WEIGHT_CRITERIA.PASS;

  if (positionPass !== (extra.positionEvidence === 'Confirmada por fonte')) {
    fail(`${label}: critério estruturado de posição diverge de positionEvidence.`);
  }
  if (weightPass !== String(extra.weightEvidence || '').startsWith('Confirmado')) {
    fail(`${label}: critério estruturado de peso diverge de weightEvidence.`);
  }

  const result = validateExtraConfirmation(extra);
  if (!result.ok) fail(`${label}: ${result.message}`);

  if (extraConfirmationPasses(extra) && !(extra.src || []).length) {
    fail(`${label}: Confirmado precisa registrar ao menos uma fonte em src.`);
  }

  const generatedExtra = generatedByN.get(extra.n);
  if (!generatedExtra || JSON.stringify(generatedExtra.confirmationCriteria) !== JSON.stringify(criteria)) {
    fail(`${label}: artefato gerado está fora de sincronia com confirmationCriteria canônico.`);
  }
}

const confirmed = extras.filter(extra => extra.confirmation === 'Confirmado');
const partial = extras.filter(extra => extra.confirmation === 'Parcial');
const pending = extras.filter(extra => extra.confirmation === 'A confirmar');
const positionPass = extras.filter(extra => extra.confirmationCriteria?.position === POSITION_CRITERIA.PASS);
const weightPass = extras.filter(extra => extra.confirmationCriteria?.weight === WEIGHT_CRITERIA.PASS);
const bothPass = extras.filter(extra => extraConfirmationPasses(extra));

if (confirmed.length !== bothPass.length) {
  fail(`Quantidade de Confirmados (${confirmed.length}) diverge dos itens que passam nos dois critérios (${bothPass.length}).`);
}

if (failures.length) {
  console.error('Etapa 2.1 — falhas no contrato de confirmação das Leituras Extras:');
  failures.forEach(message => console.error(`- ${message}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  policy: EXTRA_CONFIRMATION_POLICY,
  extras: extras.length,
  positionPass: positionPass.length,
  weightPass: weightPass.length,
  bothPass: bothPass.length,
  confirmed: confirmed.length,
  partial: partial.length,
  pending: pending.length
}, null, 2));
