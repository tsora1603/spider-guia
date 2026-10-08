import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, SRC_DIR, readJson } from './lib/data-utils.mjs';
import vm from 'node:vm';
import { isAnnotatedText, plainText } from './lib/spoiler-data.mjs';

// Cópia deliberada da heurística do runtime pré-Marco D. Ela existe SOMENTE neste
// gerador de revisão e nunca é importada pelo site.
const phrases = [
  'Peter descobre a verdade sobre Richard e Mary Parker e entende que seus pais eram agentes duplos.',
  'Peter descobre a verdade sobre Richard e Mary Parker, entendendo que seus pais eram agentes duplos e exonerando-os das acusações de traição.',
  'A #37 da Amazing (2018) ressuscita o Sin-Eater, vilão deste arco.',
  'É este casamento que One More Day apaga (#544–545).',
  'Morte do Doutor Octopus.',
  "A Tia May 'morre' (depois se revela uma atriz, ver 'The Gathering of Five and The Final Chapter').",
  'A revelação polêmica: os exames indicam que Peter é o clone e Ben, o original.',
  "Ben deixa a identidade de Scarlet Spider e assume 'Spider-Man'.",
  'Ben é fotografado sem máscara',
  'O bebê de Peter e MJ nasce morto; Osborn se revela por trás da saga.',
  'Osborn confirma que Peter é o original e Ben é o clone; Ben morre salvando Peter, que volta a ser o Homem-Aranha.',
  'Apresenta a Spider-Girl (May Parker).',
  "Peter 'morre' e volta com habilidades novas",
  'Na Civil War #2, Peter revela a identidade em rede nacional.',
  'O acordo com Mephisto, que apaga o casamento',
  'Kindred ressuscita o Sin-Eater',
  'O Duende Verde é desmascarado',
  'A identidade do Duende Verde é revelada: Norman Osborn, pai do melhor amigo de Peter, Harry.',
  'A morte de Gwen Stacy',
  'O Duende Verde mata Gwen Stacy (#121) e Norman Osborn morre no confronto seguinte (#122).',
  'Harry Osborn vira Duende Verde',
  'Harry, melhor amigo de Peter, assume o manto do pai.',
  'Ben Reilly (o clone) reaparece, Peter deixa o manto, Mary Jane engravida e tudo termina com a revelação de que Norman Osborn estava por trás da trama e de que Ben era o clone.',
  'A Tia May morre (#400)',
  'A Tia May morre na edição de marco #400, de DeMatteis e Bagley. Em 1998, revela-se que quem morreu era uma atriz contratada por Osborn.',
  'Osborn revela que a May que morreu na #400 era uma atriz geneticamente alterada; a verdadeira May estava em cativeiro e fica sob os cuidados de Reed Richards.',
  'May percebe que o filho é o Homem-Aranha ao se deparar com a identidade secreta dele.',
  'Revela que Gwen Stacy teve filhos com Norman Osborn',
  "Peter, mortalmente ferido, 'morre' e volta com habilidades novas.",
  'Guerra Civil: Peter revela a identidade',
  'Para salvar a Tia May, Peter e MJ aceitam o acordo de Mephisto: o casamento deixa de ter existido e ninguém lembra quem está sob a máscara.',
  'Dying Wish: Octopus rouba o corpo de Peter',
  'o Doutor Octopus troca de mente com Peter em #700 e assume a identidade do Homem-Aranha',
  'Ele é o filho biológico de Ben e May Parker e, portanto, primo de Peter.',
  'o Capitão Stacy morre nas #89–90',
  'Gwen Stacy morre na #121',
  'simbionte revelado na #258',
  'Tia May "morre" na #400; Ben Reilly vira o Homem-Aranha na #407',
  'Peter e Mary Jane se casam',
  'o casamento de Peter e MJ',
  'casamento de Peter e Mary Jane',
  'a lua de mel de Peter e Mary Jane'
];

const rules = [
  ['forte', 'morte', /\b(?:morre|morreu|morta|morto|morte|mata|matou|assassin(?:a|ado|ato)|falec)\b/i],
  ['forte', 'ressurreição', /\b(?:ressusc|retorna? dos mortos|volta (?:à|a) vida)\w*/i],
  ['forte', 'revelação/identidade', /\b(?:revela(?:ção|do|da|m)?|descobre|verdade|segredo|desmascar|sem máscara|identidade secreta)\b/i],
  ['leve', 'relacionamento/casamento', /\b(?:casamento|casam|casou|se casa|noivad[oa]?|lua de mel|marido|esposa)\b/i],
  ['forte', 'gravidez/família', /\b(?:grávida|gravidez|bebê|filho biológico|filha biológica|paternidade|maternidade)\b/i],
  ['forte', 'clone/original', /\b(?:clone|original)\b/i],
  ['leve', 'mudança de identidade', /\b(?:assume o manto|assume a identidade|vira (?:o|a)|torna-se|passa a ser)\b/i],
  ['forte', 'traição/ruptura', /\b(?:traição|trai|separa(?:ção|m)?|divórcio|rompimento)\b/i],
  ['leve', 'simbionte/traje', /\b(?:simbionte|traje alienígena)\b/i],
  ['forte', 'Mephisto/pacto', /\b(?:Mephisto|pacto|acordo com)\b/i],
  ['forte', 'troca de corpo', /\b(?:troca de mente|troca de corpos?|rouba o corpo)\b/i],
  ['forte', 'poderes/aposentadoria', /\b(?:perde os poderes|novas? habilidades|novos poderes|larga o manto|abandona o manto|aposenta(?:d[oa])?)\b/i],
  ['leve', 'romance', /\b(?:namora|namoro|romance|beija|relacionamento)\b/i],
  ['forte', 'parentesco', /\b(?:é o pai|é a mãe|é filho|é filha|primo de|irmão de|irmã de)\b/i],
  ['forte', 'responsável oculto', /\b(?:estava por trás|por trás da (?:saga|trama)|verdadeiro responsável)\b/i],
  ['forte', 'captura/sequestro', /\b(?:capturad[oa]|sequestrad[oa]|cativeiro|pres[oa])\b/i],
  ['forte', 'ferimento/doença', /\b(?:cura|doença|doente|mortalmente ferido)\b/i],
  ['forte', 'desfecho', /\b(?:vence|derrota|desfecho|final da saga|resultado)\b/i],
  ['leve', 'estreia/origem', /\b(?:estreia|primeiro encontro|primeira aparição|apresenta|introduz|surge|origem de|origem do)\b/i],
  ['forte', 'perda/salvamento', /\b(?:perde|perda de|salva|é salvo|fica com|vai embora|deixa Peter|deixa Mary Jane)\b/i],
  ['leve', 'cerimônia', /\b(?:aceita o pedido|pedido de casamento|cerimônia|vida de casados)\b/i]
];

const suggestions = [];
const dedupe = new Set();
const sentences = text => text.split(/(?<=[.!?;])(?=\s)|(?=\s[—–-]\s)/).map(value => value.trim()).filter(Boolean);

function add(file, pointer, text, match, suggestedLevel, heuristic) {
  const key = `${file}|${pointer}|${text}|${heuristic}`;
  if (dedupe.has(key)) return;
  dedupe.add(key);
  suggestions.push({
    id: '',
    sourceFile: file,
    path: pointer,
    text,
    match,
    suggestedLevel,
    heuristic,
    decision: 'pending'
  });
}

function inspect(value, file, pointer) {
  if (isAnnotatedText(value)) return; // já migrado por decisão editorial explícita
  const text = plainText(value);
  if (!text.trim() || /^https?:\/\//i.test(text.trim())) return;
  for (const phrase of phrases) {
    if (text.includes(phrase)) add(file, pointer, phrase, phrase, 'forte', 'frase-literal-legada');
  }
  for (const chunk of sentences(text)) {
    for (const [level, label, regex] of rules) {
      const found = chunk.match(regex);
      if (found) add(file, pointer, chunk, found[0], level, `regex-legada:${label}`);
    }
  }
}

// Replica os pontos que ainda passavam por <SpoilerText> no Marco C. Campos que já
// eram explicitamente strong foram migrados no próprio dado e são ignorados aqui.
const manifest = await readJson(path.join(SRC_DIR, 'manifest.json'));
for (const relative of manifest.catalogFiles) {
  const group = await readJson(path.join(SRC_DIR, relative));
  group.items.forEach((item, index) => {
    inspect(item.instructions, `data/src/${relative}`, `/items/${index}/instructions`);
    inspect(item.note, `data/src/${relative}`, `/items/${index}/note`);
  });
}

const extras = await readJson(path.join(SRC_DIR, 'editorial', 'extras.json'));
extras.forEach((extra, index) => {
  inspect(extra.name, 'data/src/editorial/extras.json', `/${index}/name`);
  inspect(extra.confirmationDetail || extra.just, 'data/src/editorial/extras.json', `/${index}/confirmationDetail`);
});

const fases = await readJson(path.join(SRC_DIR, 'fases.json'));
fases.forEach((fase, index) => inspect(fase.notes, 'data/src/fases.json', `/${index}/notes`));

const marcos = await readJson(path.join(SRC_DIR, 'marcos.json'));
marcos.forEach((marco, index) => inspect(marco.title, 'data/src/marcos.json', `/${index}/title`));

const fontes = await readJson(path.join(SRC_DIR, 'fontes.json'));
fontes.forEach((source, index) => inspect(source.usedFor, 'data/src/fontes.json', `/${index}/usedFor`));

const glossario = await readJson(path.join(SRC_DIR, 'glossario.json'));
glossario.forEach((entry, index) => inspect(entry.definition, 'data/src/glossario.json', `/${index}/definition`));

const metodologia = await readJson(path.join(SRC_DIR, 'editorial', 'metodologia.json'));
metodologia.forEach((entry, index) => inspect(entry.body, 'data/src/editorial/metodologia.json', `/${index}/body`));

// Links continuam curados em JS e também passavam por SpoilerText (name/context).
const linksSource = await fs.readFile(path.join(ROOT, 'public', 'links.js'), 'utf8');
const context = { window: { LINKS_ENABLED: true } };
vm.runInNewContext(linksSource, context, { filename: 'public/links.js' });
const links = context.window.EDITORIAL_LINKS || context.window.getEditorialLinks?.() || [];
links.forEach((group, index) => {
  inspect(group.name || group.title, 'public/links.js', `/EDITORIAL_LINKS/${index}/name`);
  inspect(group.context, 'public/links.js', `/EDITORIAL_LINKS/${index}/context`);
});

suggestions.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.path.localeCompare(b.path) || a.text.localeCompare(b.text));
suggestions.forEach((entry, index) => { entry.id = `SP-${String(index + 1).padStart(4, '0')}`; });
const summary = {
  generatedAt: new Date().toISOString(),
  appliedAutomatically: 0,
  total: suggestions.length,
  leve: suggestions.filter(entry => entry.suggestedLevel === 'leve').length,
  forte: suggestions.filter(entry => entry.suggestedLevel === 'forte').length,
  note: 'Lista para revisão humana. decision=pending não altera os dados nem o runtime.'
};
const payload = { summary, suggestions };
const reviewDir = path.join(ROOT, 'data', 'review');
await fs.mkdir(reviewDir, { recursive: true });
await fs.writeFile(path.join(reviewDir, 'spoiler-suggestions.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const markdown = [
  '# Sugestões de spoilers — revisão pendente',
  '',
  `Geradas: **${summary.total}** · leve: **${summary.leve}** · forte: **${summary.forte}**.`,
  '',
  '> Nenhuma sugestão deste arquivo foi aplicada automaticamente. Edite `decision` apenas após revisão.',
  '',
  '| ID | Nível | Arquivo / caminho | Heurística | Trecho |',
  '|---|---|---|---|---|',
  ...suggestions.map(entry => `| ${entry.id} | ${entry.suggestedLevel} | \`${entry.sourceFile}${entry.path}\` | ${entry.heuristic} | ${entry.text.replaceAll('|', '\\|').replaceAll('\n', ' ')} |`),
  ''
].join('\n');
await fs.writeFile(path.join(reviewDir, 'spoiler-suggestions.md'), markdown, 'utf8');
console.log(JSON.stringify(summary, null, 2));
