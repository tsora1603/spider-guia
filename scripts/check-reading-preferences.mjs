import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const data = JSON.parse(read('src/data/generated-data.json'));
const fields = Object.fromEntries(data.itemFields.map((field, index) => [field, index]));
const source = {
  preferences: read('src/preferences/reading-preferences.ts'),
  plan: read('src/preferences/reading-plan.ts'),
  onboarding: read('src/components/Onboarding.tsx'),
  home: read('src/views/HomeView.tsx'),
  account: read('src/views/MoreView.tsx'),
  e2e: read('tests/e2e/spider-guia.spec.ts')
};

const essentialCount = data.items.filter(row => row[fields.weight] === '● Essencial').length;
const checks = {
  catalogStill1301: data.items.length === 1301,
  essentialPlanGroundedInWeight: essentialCount === 1144 && source.plan.includes("item.weight === '● Essencial'"),
  threeDepthsPersisted: ['complete', 'essential', 'focus'].every(mode => source.preferences.includes(`'${mode}'`)),
  versionedPreferenceKey: source.preferences.includes("aranha-reading-preferences-v1"),
  onboardingHasThreeSteps: source.onboarding.includes('Passo ${step} de 3') && source.onboarding.includes('Como você quer ler?') && source.onboarding.includes('Quanto spoiler pode aparecer?') && source.onboarding.includes('Já leu até onde?'),
  focusNeedsCatalogMatch: source.plan.includes('focusedReadingIds') && source.plan.includes("item.weight !== '○ Opcional'"),
  homeUsesPlan: source.home.includes('buildReadingPlan(preferences)') && source.home.includes('Sua próxima leitura'),
  accountEditsPreferences: source.account.includes('Preferências de leitura') && source.account.includes('Refazer configuração guiada'),
  playwrightCoversOnboarding: source.e2e.includes('onboarding salva as três preferências') && source.e2e.includes('Hoje respeita o modo de foco')
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ ok: failed.length === 0, checks, summary: { items: data.items.length, essentials: essentialCount } }, null, 2));
if (failed.length) process.exit(1);
