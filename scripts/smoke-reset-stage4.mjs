/** Smoke real de módulos TS sem npm (não substitui E2E/Supabase). */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { const executable = realpathSync(execFileSync('which',['tsc'],{encoding:'utf8'}).trim()); ts = require(path.join(path.dirname(executable),'..','lib','typescript.js')); }
const root=process.cwd(), out=mkdtempSync(path.join(tmpdir(),'spider-stage4-'));
const paths=['src/state/app-state.ts','src/state/progress-store.ts','src/state/storage-migrations.ts','src/reset/reset-guard.ts','src/reset/cloud-reconnect.ts','src/sync/sync-engine.ts','src/sync/server-generation.ts','src/reset/remote-reset.ts'];
for(const filename of paths){
  const code=readFileSync(path.join(root,filename),'utf8');
  const transpiled=ts.transpileModule(code,{fileName:filename,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  assert.equal(transpiled.diagnostics?.length||0,0,`Sintaxe: ${filename}`);
  let js=transpiled.outputText.replace(/from ['"](\.{1,2}\/[^'"]+)['"]/g,(_,$1)=>`from '${$1}.mjs'`);
  const destination=path.join(out,filename.replace(/\.ts$/,'.mjs'));mkdirSync(path.dirname(destination),{recursive:true});writeFileSync(destination,js);
}
for(const f of ['src/reset/CloudReconnectDialog.tsx','src/reset/DeviceResetCard.tsx','src/runtime/controller.ts','src/views/App.tsx']){
  const r=ts.transpileModule(readFileSync(path.join(root,f),'utf8'),{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(r.diagnostics?.length||0,0,`Sintaxe: ${f}`);
}
mkdirSync(path.join(out,'src/data'),{recursive:true});writeFileSync(path.join(out,'src/data/model.mjs'),'export const itemsById = Object.fromEntries(Array.from({length:1301},(_,i)=>[i+1,{id:i+1}]));');
// Stub da limpeza para testar protocolo transacional sem dependências da UI.
writeFileSync(path.join(out,'src/reset/local-reset.mjs'),'export let clears=0; export async function resetThisDevice(){clears++;}');
const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
Object.defineProperty(globalThis,'navigator',{value:{onLine:true,locks:{request:async(_name,_options,cb)=>cb({name:'lock'})}},configurable:true});
globalThis.window={setTimeout,clearTimeout,SPIDER_REMOTE_RESET_VERIFIED:false};
Object.defineProperty(globalThis,'crypto',{value:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},configurable:true});
const imports=async file=>await import(pathToFileURL(path.join(out,file)).href);
const {appState}=await imports('src/state/app-state.mjs');
const guard=await imports('src/reset/reset-guard.mjs');
const gen=await imports('src/sync/server-generation.mjs');
const recon=await imports('src/reset/cloud-reconnect.mjs');
const remoteReset=await imports('src/reset/remote-reset.mjs');
const {progressStore}=await imports('src/state/progress-store.mjs');
const {createSyncEngine}=await imports('src/sync/sync-engine.mjs');
const userId='account-a';appState.currentUser={id:userId};
let currentGeneration=1, serverRows=new Map(), directWrites=0, rpWrites=0, rpResets=0, rpcIds=[], resetOnce=false;
const client={
 auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},
 rpc:async(name,args)=>{
  if(name==='spider_sync_state')return {data:{protocol:4,generation:currentGeneration,count:serverRows.size},error:null};
  if(name==='spider_sync_push'){
   if(args.p_generation!==currentGeneration)return {error:{message:'SPIDER_STALE_GENERATION'}};
   rpWrites++;for(const row of args.p_records)serverRows.set(row.ord,row);
   return {data:{protocol:4,generation:currentGeneration,applied:args.p_records.length},error:null};
  }
  if(name==='spider_sync_confirm_empty')return args.p_generation===currentGeneration&&serverRows.size===0?{data:{generation:currentGeneration,count:0},error:null}:{error:{message:'SPIDER_CLOUD_NOT_EMPTY'}};
  if(name==='spider_sync_reset'){
   rpcIds.push(args.p_request_id);
   if(args.p_generation!==currentGeneration && !resetOnce)return {error:{message:'SPIDER_STALE_GENERATION'}};
   if(!resetOnce){currentGeneration++;serverRows.clear();rpResets++;resetOnce=true;}
   // Primeira resposta perdida depois de commit: ambiguidade realista.
   if(rpcIds.length===1)throw Error('network timeout');
   return {data:{protocol:4,generation:currentGeneration,replayed:true},error:null};
  }
 },
 from:()=>({
  select:()=>({eq:()=>({order:()=>({range:async (start,end)=>({data:[...serverRows.values()].slice(start,end+1).map(r=>({...r,updated_at:r.updated_at})),error:null})})})}),
  upsert:async()=>{directWrites++;return {error:null};}
 })
};
const sync=createSyncEngine({client,onStateChange:()=>{},onLocalChanged:()=>{},onToast:()=>{}});
progressStore.set(1,'Sim',{updatedAt:1760000000000});
assert.equal((await sync.syncLocalRecords([1])).ok,true);
assert.equal(directWrites,0);assert.equal(rpWrites,1);assert.equal(serverRows.size,1);
assert.equal(gen.getKnownGeneration(userId),1);
console.log('PASS: geração 1 utiliza RPC protegida; nenhum UPSERT direto');
currentGeneration=2;serverRows.clear();
await sync.syncLocalRecords([1]);
assert.equal(serverRows.size,0);assert.equal(guard.isSyncBlocked(),true);
assert.equal(guard.cloudDecision(),'pending');
console.log('PASS: reset por outro dispositivo bloqueia push da geração antiga');
const stalePreview={...recon.previewCloud([]), protocolGeneration:2};
await assert.rejects(recon.authorizeEmptyCloud({client,userId,invalidate:sync.invalidate,waitForInFlight:sync.waitForInFlight,afterRestored:async()=>{}},stalePreview),/anterior ao reset remoto/);
console.log('PASS: leituras antigas não podem ser republicadas em geração nova');
// Reset local voluntário apaga registros antigos e o vínculo da geração, mantendo trava pendente.
guard.beginLocalReset(); guard.completeLocalReset();
progressStore.restoreSnapshot({}); values.delete(gen.SERVER_GENERATIONS_KEY); gen.refreshGenerationAfterLocalReset();
// Começar com nuvem vazia exige dispositivo também vazio na geração reiniciada.
const expected={...recon.previewCloud([]), protocolGeneration:2};
await recon.authorizeEmptyCloud({client,userId,invalidate:sync.invalidate,waitForInFlight:sync.waitForInFlight,afterRestored:async()=>{}},expected);
assert.equal(guard.mayUseCloud(userId),true);assert.equal(gen.getKnownGeneration(userId),2);
progressStore.set(1,'Sim',{updatedAt:1760000000000}); // leitura nova, após consentimento.
assert.equal((await sync.syncLocalRecords([1])).ok,true);
assert.equal(serverRows.size,1);
console.log('PASS: consentimento explícito para nova sincronização vazia em geração 2');
const deps={client,sync,disconnect:async()=>{}};
await assert.rejects(remoteReset.resetDeviceAndCloud(deps,'APAGAR'),/indisponível/);
assert.equal(serverRows.size,1);assert.equal(rpResets,0);
console.log('PASS: reset remoto desabilitado até validação administrativa');
window.SPIDER_REMOTE_RESET_VERIFIED=true;
await assert.rejects(remoteReset.resetDeviceAndCloud(deps,'ERRADO'),/APAGAR/);
await assert.rejects(remoteReset.resetDeviceAndCloud(deps,'APAGAR'),/Não foi possível confirmar/);
assert.equal(rpResets,1);assert.equal(serverRows.size,0);
assert.equal(remoteReset.cloudResetIntent()?.phase,'pending');
const {clears:clearsBefore}=await imports('src/reset/local-reset.mjs'); assert.equal(clearsBefore,0);
await remoteReset.resumeCloudReset(deps);
assert.equal(rpcIds.length,2);assert.equal(rpcIds[0],rpcIds[1]);
assert.equal(rpResets,1);assert.equal(remoteReset.cloudResetIntent(),null);
const {clears}=await imports('src/reset/local-reset.mjs');assert.equal(clears,1);
console.log('PASS: resposta perdida recupera pelo mesmo request_id, sem segundo DELETE');
console.log('SYNTAX PASS: TS/TSX de integração transpila sem erro sintático');
