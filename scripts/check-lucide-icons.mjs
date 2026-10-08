import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const root = process.cwd();
const icons = read(path.join(root, 'src/components/Icon.tsx'));
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const styles = read(path.join(root, 'src/styles.css'));
const views = read(path.join(root, 'src/views/App.tsx'));
const filter = read(path.join(root, 'src/components/FilterDropdown.tsx'));
const assert = (condition, message) => { if (!condition) throw new Error(`Lucide: ${message}`); };

assert(Boolean(pkg.dependencies?.['lucide-preact']), 'dependência lucide-preact ausente');
assert(/from ['"]lucide-preact['"]/.test(icons), 'o componente Icon não usa lucide-preact');
assert(!/<svg|<path|<circle|transform=/.test(icons), 'Icon ainda usa geometria SVG manual');
assert(/settings:\s*Settings/.test(icons), 'engrenagem não usa Settings oficial');
assert(/className=\{`i/.test(icons) && /aria-hidden="true"/.test(icons), 'estilo/acessibilidade do ícone alterados');
assert(/key: 'Configurações', icon: 'settings'/.test(views), 'navegação não usa ícone Settings');
assert(/key: 'Checklist', icon: 'checklist'/.test(views), 'Checklist não usa ícone de lista');
assert(/filter-option-check/.test(filter), 'filtros ainda não usam ícone Lucide');
assert(!/content:\s*["'](?:✓|›)["']/.test(styles), 'ícones tipográficos antigos ainda no CSS');
assert(/disclosure-chevron/.test(styles), 'expansões sem ícones Lucide');

console.log('Lucide: ícones oficiais, navegação, controles e disclosures verificados.');
