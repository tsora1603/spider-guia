import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const files = walk('src').filter((file) => /\.tsx?$/.test(file));
const graph = new Map();
for (const file of files) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const dependencies = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const typeOnly =
        node.isTypeOnly ||
        clause?.isTypeOnly ||
        (clause &&
          !clause.name &&
          named &&
          ts.isNamedImports(named) &&
          named.elements.every((item) => item.isTypeOnly));
      if (specifier && ts.isStringLiteral(specifier) && !typeOnly) {
        const target = specifier.text;
        if (target.startsWith('.'))
          dependencies.push(path.normalize(path.join(path.dirname(file), target)));
        check(
          target !== '@supabase/supabase-js' || file === 'src/auth/supabase-sdk.ts',
          `${file}: o SDK deve entrar pela fronteira carregada sob demanda.`
        );
        check(
          !/generated-(?:extra|clone|help)-details\.json$/.test(target),
          `${file}: detalhes editoriais devem usar import() sob demanda.`
        );
        check(
          !/generated-data\.json$/.test(target),
          `${file}: o catálogo completo não pertence ao bundle inicial.`
        );
      }
    }
    if (ts.isJsxAttribute(node))
      check(
        node.name.getText(ast) !== 'dangerouslySetInnerHTML',
        `${file}: texto editorial deve ser renderizado como texto.`
      );
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left)
    ) {
      check(node.left.name.text !== 'innerHTML', `${file}: evite injetar HTML.`);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  graph.set(file.replace(/\.tsx?$/, ''), dependencies);
  if (file.endsWith('.ts') && /^src\/(auth|progress|reset|sync|state|data)\//.test(file)) {
    check(
      !dependencies.includes('src/runtime/controller'),
      `${file}: serviços não podem importar a fachada de inicialização.`
    );
  }
}
// Detecta ciclos de execução; imports apenas de tipos não criam dependência em runtime.
const visiting = new Set();
const visited = new Set();
const visitModule = (file, chain) => {
  if (visited.has(file)) return;
  if (visiting.has(file)) {
    failures.push(`Ciclo de módulos: ${[...chain, file].join(' → ')}`);
    return;
  }
  visiting.add(file);
  for (const dependency of graph.get(file) || [])
    if (graph.has(dependency)) visitModule(dependency, [...chain, file]);
  visiting.delete(file);
  visited.add(file);
};
for (const file of graph.keys()) visitModule(file, []);
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile).config;
check(config.compilerOptions.strict === true, 'TypeScript deve permanecer em modo estrito.');
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`Contratos de módulos: ${files.length} arquivos, sem ciclos de execução.`);
