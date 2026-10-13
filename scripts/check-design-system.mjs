import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(rel) : [rel];
  });
const fail = (message) => {
  console.error(`ETAPA 4 FAIL: ${message}`);
  process.exitCode = 1;
};

const sourceFiles = walk('src').filter((file) => /\.(?:ts|tsx|css)$/.test(file));
for (const file of sourceFiles) {
  const text = read(file);
  if (text.includes('!important')) fail(`${file} contém !important`);
  if (
    /\bstyle\s*=/.test(text) ||
    /style=\{/.test(text) ||
    (/\.(?:ts|tsx)$/.test(file) && /\bstyle\s*:/.test(text))
  )
    fail(`${file} contém estilo inline`);
  if (
    file.endsWith('.css') &&
    file !== 'src/design-system.css' &&
    /#[0-9a-f]{3,8}\b/i.test(text.replace(/%23[0-9a-f]{6}/gi, ''))
  )
    fail(`${file} contém cor literal fora dos tokens`);
}

const css = read('src/design-system.css');
for (const token of [
  '--space-1',
  '--font-body',
  '--text-md',
  '--radius-md',
  '--elevation-1',
  '--page',
  '--text',
  '--target-min'
]) {
  if (!css.includes(token)) fail(`token obrigatório ausente: ${token}`);
}
if (!css.includes('[data-theme="dark"]') || !css.includes('[data-theme="light"]'))
  fail('temas claro/escuro não declarados');
if (!css.includes('[data-font-scale="compact"]') || !css.includes('[data-font-scale="large"]'))
  fail('escala tipográfica não declarada');
if (!css.includes(':focus-visible')) fail('foco visível global ausente');
if (!/--target-min:\s*2\.75rem/.test(css)) fail('alvo mínimo de 44 px não está formalizado');

const hexToRgb = (hex) => {
  const raw = hex.replace('#', '');
  const value = raw.length === 3 ? [...raw].map((char) => char + char).join('') : raw;
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
};
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
const declarations = (block) =>
  Object.fromEntries(
    [...block.matchAll(/(--[\w-]+)\s*:\s*(#[\da-f]{3,8})\b/gi)].map((match) => [match[1], match[2]])
  );
const base = declarations(css.match(/:root\s*\{([^}]+)\}/)[1]);
const pairs = [];
for (const theme of ['dark', 'light']) {
  const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]+)\\}`));
  if (!block) throw new Error(`Tema ausente: ${theme}`);
  const tokens = { ...base, ...declarations(block[1]) };
  const roles = [
    ['texto/página', '--text', '--page'],
    ['secundário/página', '--text-muted', '--page'],
    ['link/página', '--link', '--page'],
    ['botão primário', '--on-solid', '--primary'],
    ['success', '--success-text', '--surface-1'],
    ['warning', '--warning-text', '--warning-surface'],
    ['danger', '--danger-text', '--danger-surface']
  ];
  if (theme === 'light') roles.push(['seleção', '--accent', '--selection-surface']);
  for (const [name, fg, bg] of roles) {
    if (!tokens[fg] || !tokens[bg]) throw new Error(`Token de contraste ausente: ${fg}/${bg}`);
    pairs.push([`${theme} ${name}`, tokens[fg], tokens[bg]]);
  }
}
for (const [name, fg, bg] of pairs) {
  const ratio = contrast(fg, bg);
  if (ratio < 4.5) fail(`${name} = ${ratio.toFixed(2)}:1, abaixo de 4.5:1`);
  else console.log(`${name.padEnd(27)} ${ratio.toFixed(2)}:1`);
}

if (!process.exitCode) console.log('Design OK: tokens, contraste AA e alvos de 44 px.');
