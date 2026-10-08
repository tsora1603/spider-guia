/** Valida reset REAL sem Preact/npm, usando mocks apenas para preferências/UI. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url); let ts;
try { ts=require('typescript'); } catch { const bin=realpathSync(execFileSync('which',['tsc'],{encoding:'utf8'}).trim()); ts=require(path.join(path.dirname(bin),'..','lib','typescript.js')); }
const out=mkdtempSync(path.join(tmpdir(),'spider-local-stage4-'));
const files=['src/state/app-state.ts','src/state/progress-store.ts','src/state/storage-migrations.ts','src/reset/reset-guard.ts','src/reset/local-reset.ts','src/sync/server-generation.ts'];
for(const f of files){const r=ts.transpileModule(readFileSync(f,'utf8'),{fileName:f,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});const dest=path.join(out,f.replace('.ts','.mjs'));mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,r.outputText.replace(/from ['"](\.{1,2}\/[^'"]+)['"]/g,(_,$1)=>`from '${$1}.mjs'`));}
const stub=(filename,code)=>{const full=path.join(out,filename);mkdirSync(path.dirname(full),{recursive:true});writeFileSync(full,code);};
stub('src/preferences/reading-preferences.mjs',"export const READING_PREFERENCES_KEY='aranha-reading-preferences-v1'; export const readingPreferences={notifyReset(){}};");
stub('src/design/preferences.mjs',"export const DESIGN_PREFERENCES_KEY='aranha-design-preferences-v1'; export const designPreferences={resetInMemory(){}};");
stub('src/engagement/preferences.mjs',"export const ENGAGEMENT_STORAGE_KEY='aranha-engagement-v1'; export const engagementPreferences={resetInMemory(){}};");
stub('src/spoilers/preferences.mjs',"export const SPOILER_LEVEL_KEY='aranha-spoiler-level-v1';export const LEGACY_CONSENT_KEYS=['aranha-spoiler-consent-links-v1'];export const spoilerPreferences={resetInMemory(){}};");
const values=new Map([['outro-aplicativo','conservar'],['aranha-progress-v1','{"1":"Sim"}'],['aranha-reading-preferences-v1','{}'],['aranha-server-generations-v1','{"usuario":1}'],['aranha-spoiler-consent-links-v1','1']]);
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});globalThis.window={setTimeout,clearTimeout};
const imp=async p=>import(pathToFileURL(path.join(out,p)).href);
const {appState}=await imp('src/state/app-state.mjs');const {progressStore}=await imp('src/state/progress-store.mjs');const {resetThisDevice,RESET_STORAGE_KEYS}=await imp('src/reset/local-reset.mjs');const guard=await imp('src/reset/reset-guard.mjs');
progressStore.load();appState.currentUser={id:'usuario'};let writes=0,disconnects=0;
const sync={invalidate:()=>{writes++;},waitForInFlight:async()=>{}};
await assert.rejects(resetThisDevice({sync,disconnect:async()=>{throw Error('logout falhou');}}),/logout falhou/);
assert.equal(values.get('aranha-progress-v1'),'{"1":"Sim"}'); // falha antes da limpeza preserva o progresso
assert.equal(guard.resetPhase(),'preparing');
assert.equal(values.get('outro-aplicativo'),'conservar');
console.log('PASS: falha de logout impede limpeza e mantém a trava');
await resetThisDevice({sync,disconnect:async()=>{disconnects++;}});
assert.equal(disconnects,1);assert.equal(writes,2);
for(const key of RESET_STORAGE_KEYS)assert.equal(values.has(key),false,`Não limpou: ${key}`);
assert.equal(values.get('outro-aplicativo'),'conservar');
assert.equal(guard.cloudDecision(),'pending');assert.equal(guard.isSyncBlocked(),true);
assert.equal(appState.currentUser,null);assert.deepEqual(appState.progress,{});assert.deepEqual(appState.readingLog,{});
console.log('PASS: limpeza seletiva REAL, nuvem bloqueada, progresso/histórico vazios e chave de terceiros preservada');
