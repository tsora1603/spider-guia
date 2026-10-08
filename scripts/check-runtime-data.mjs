import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './lib/data-utils.mjs';

const context = { window: { LINKS_ENABLED: true }, console };
context.globalThis = context;
vm.createContext(context);
const dataSource = await fs.readFile(path.join(ROOT, 'data.js'), 'utf8');
const linksSource = await fs.readFile(path.join(ROOT, 'public', 'links.js'), 'utf8');
const validatorSource = await fs.readFile(path.join(ROOT, 'public', 'validator.js'), 'utf8');
vm.runInContext(`${dataSource}\nglobalThis.__SPIDER_DATA__ = DATA;`, context, { filename: 'data.js' });
vm.runInContext(linksSource, context, { filename: 'links.js' });
vm.runInContext(validatorSource, context, { filename: 'validator.js' });
const links = typeof context.window.getEditorialLinks === 'function' ? context.window.getEditorialLinks() : [];
const result = context.window.SpiderValidator.validate(context.__SPIDER_DATA__, links);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
