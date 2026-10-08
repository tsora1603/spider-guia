import fs from 'node:fs';

const read = name => fs.readFileSync(name, 'utf8');
const fail = message => { throw new Error(`Auditoria UX Etapa 2: ${message}`); };
const dropdown = read('src/components/FilterDropdown.tsx');
const component = read('src/components/ListSearch.tsx');
const css = read('src/styles.css');
const theme = read('src/design-system.css');
const checklist = read('src/components/VirtualizedChecklist.tsx');
const extras = read('src/views/ReadingView.tsx');
const help = read('src/views/HelpView.tsx');
const journey = read('src/views/JourneyView.tsx');
const links = read('src/views/LinksView.tsx');
const e2e = read('tests/e2e/spider-guia.spec.ts');
const checks = {
  sharedFilter: checklist.includes('<FilterDropdown') && extras.includes('<FilterDropdown') && !checklist.includes('<details class="filter-dropdown"') && !extras.includes('<details class="filter-dropdown"'),
  keyboard: ['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab', 'pointerdown', 'aria-expanded', 'aria-pressed', 'onChange(optionValue)', 'close(true)', 'opens-above'].every(token => (dropdown + css).includes(token)),
  accessibleSearch: ['type="search"', 'aria-label={label}', 'data-shortcut-search'].every(token => component.includes(token)),
  controlledSearch: ['views/ExploreView.tsx','views/LinksView.tsx','views/HelpView.tsx','components/VirtualizedChecklist.tsx'].every(file => read('src/'+file).includes('<ListSearch')),
  semanticLists: ['ui-list', 'ui-list-item', 'ui-disclosure-summary'].every(token => css.includes('.'+token)) && [journey, links, help, extras].every(text => text.includes('ui-list')),
  nestedBoxesRemoved: !css.includes("content:'Detalhes da fase'") && !css.includes("content:'Detalhes do link'") && css.includes('.journey-phase .journey-body{padding:14px 16px 17px;border-top:1px solid var(--border-subtle);background:transparent}') && css.includes('.link-panel{padding:0;background:transparent;min-width:0}') && css.includes('.source-site-body{padding:0;background:transparent}'),
  themesAndFocus: theme.includes('[data-theme="light"]') && theme.includes('[data-theme="dark"]') && theme.includes(':focus-visible') && css.includes('.filter-trigger:focus-visible') && css.includes('--target-min'),
  e2eRegression: ['dropdown seleciona', 'Extras reutiliza', 'sem caixas internas escuras', '320 px e 1440 px'].every(token => e2e.includes(token))
};
console.log(JSON.stringify({ ok: Object.values(checks).every(Boolean), checks }, null, 2));
for (const [name, ok] of Object.entries(checks)) if (!ok) fail(name);
