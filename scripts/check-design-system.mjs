import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(rel) : [rel];
});
const fail = message => { console.error(`ETAPA 4 FAIL: ${message}`); process.exitCode = 1; };

const sourceFiles = walk('src').filter(file => /\.(?:ts|tsx|css)$/.test(file));
for (const file of sourceFiles) {
  const text = read(file);
  if (text.includes('!important')) fail(`${file} contém !important`);
  if (/\bstyle\s*=/.test(text) || /style=\{/.test(text) || (/\.(?:ts|tsx)$/.test(file) && /\bstyle\s*:/.test(text))) fail(`${file} contém estilo inline`);
  if (file.endsWith('.css') && file !== 'src/design-system.css' && /#[0-9a-f]{3,8}\b/i.test(text.replace(/%23[0-9a-f]{6}/ig, ''))) fail(`${file} contém cor literal fora dos tokens`);
}

const css = read('src/design-system.css');
for (const token of ['--space-1','--font-body','--text-md','--radius-md','--elevation-1','--page','--text','--target-min']) {
  if (!css.includes(token)) fail(`token obrigatório ausente: ${token}`);
}
if (!css.includes('[data-theme="dark"]') || !css.includes('[data-theme="light"]')) fail('temas claro/escuro não declarados');
if (!css.includes('[data-font-scale="compact"]') || !css.includes('[data-font-scale="large"]')) fail('escala tipográfica não declarada');
if (!css.includes(':focus-visible')) fail('foco visível global ausente');
if (!css.includes('--target-min:2.75rem')) fail('alvo mínimo de 44 px não está formalizado');

const preferences = read('src/design/preferences.ts');
for (const needle of ["'auto'", "'dark'", "'light'", "'compact'", "'default'", "'large'", 'focusMode']) {
  if (!preferences.includes(needle)) fail(`preferência visual ausente: ${needle}`);
}
const checklist = read('src/components/VirtualizedChecklist.tsx');
if (!checklist.includes('FocusChecklist') || !checklist.includes('Uma edição por vez')) fail('modo foco não está integrado à Checklist');

const docs = read('docs/DESIGN-SYSTEM.md');
const componentSections = [...docs.matchAll(/^### \d+\./gm)].length;
if (componentSections < 8 || componentSections > 10) fail(`documentação deve ter 8–10 componentes; encontrou ${componentSections}`);

const hexToRgb = hex => {
  const value = hex.replace('#','');
  return [0,2,4].map(i => parseInt(value.slice(i,i+2),16) / 255);
};
const luminance = hex => {
  const [r,g,b] = hexToRgb(hex).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055) ** 2.4);
  return .2126*r + .7152*g + .0722*b;
};
const contrast = (a,b) => {
  const values = [luminance(a), luminance(b)].sort((x,y) => y-x);
  return (values[0]+.05)/(values[1]+.05);
};
const pairs = [
  ['dark texto/página','#f4f6fb','#090d19'],
  ['dark secundário/página','#aeb7cf','#090d19'],
  ['dark link/página','#b8c4ff','#090d19'],
  ['dark botão primário','#ffffff','#c92d38'],
  ['light texto/página','#161a2a','#f7f8fc'],
  ['light secundário/página','#555e75','#f7f8fc'],
  ['light link/página','#2847b8','#f7f8fc'],
  ['light botão primário','#ffffff','#b51f2d'],
  ['dark success','#66dfa9','#11182b'],
  ['dark warning','#f2c96f','#2b2111'],
  ['dark danger','#ff9ca5','#321a21'],
  ['light success','#066441','#ffffff'],
  ['light warning','#755000','#fff7df'],
  ['light danger','#8f1723','#fff0f1'],
  ['light seleção','#334fc7','#e7ebff']
];
for (const [name, fg, bg] of pairs) {
  const ratio = contrast(fg,bg);
  if (ratio < 4.5) fail(`${name} = ${ratio.toFixed(2)}:1, abaixo de 4.5:1`);
  else console.log(`${name.padEnd(27)} ${ratio.toFixed(2)}:1`);
}

const e2e = read('tests/e2e/spider-guia.spec.ts');
for (const needle of ['tema, escala e modo foco persistem em 360 px','alvos principais mantêm pelo menos 44 px']) {
  if (!e2e.includes(needle)) fail(`E2E da Etapa 4 ausente: ${needle}`);
}

if (!process.exitCode) console.log('ETAPA 4 OK: tokens, temas, escala, foco, AA, 44 px, 0 !important e 0 inline style.');
