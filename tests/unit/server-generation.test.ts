import { beforeEach, describe, expect, it, vi } from 'vitest';
const values = new Map<string,string>();
const storage = { getItem: (k:string)=>values.get(k)??null, setItem:(k:string,v:string)=>{values.set(k,v);}, removeItem:(k:string)=>{values.delete(k);} };
const makeClient = (generation:number, count=0) => ({rpc:vi.fn(async () => ({data:{protocol:4,generation,count},error:null}))});
beforeEach(() => {vi.resetModules();values.clear();vi.stubGlobal('localStorage',storage);vi.stubGlobal('navigator',{onLine:true});vi.stubGlobal('window',{setTimeout,clearTimeout});});
describe('protocolo de geração controlada no servidor',()=>{
 it('adota somente a geração inicial para usuários legados',async()=>{
   const {checkServerGeneration,getKnownGeneration}=await import('../../src/sync/server-generation');
   expect(await checkServerGeneration(makeClient(1), 'user-a')).toEqual({mode:'protected',generation:1,count:0});
   expect(getKnownGeneration('user-a')).toBe(1);
 });
 it('geração divergente bloqueia operações e mantém dados locais',async()=>{
   const gen=await import('../../src/sync/server-generation');const guard=await import('../../src/reset/reset-guard');
   await gen.checkServerGeneration(makeClient(1),'user-a');
   await expect(gen.checkServerGeneration(makeClient(2),'user-a')).rejects.toThrow(/reiniciado/);
   expect(guard.isSyncBlocked()).toBe(true);
   expect(guard.cloudDecision()).toBe('pending');
 });
 it('geração nova sem vínculo exige decisão, inclusive em outro navegador',async()=>{
   const gen=await import('../../src/sync/server-generation');
   await expect(gen.checkServerGeneration(makeClient(4),'user-a')).rejects.toThrow(/reiniciado/);
   expect(values.has(gen.SERVER_GENERATIONS_KEY)).toBe(false);
 });
 it('falha RPC não aceita escrita legada como fallback',async()=>{
   const gen=await import('../../src/sync/server-generation');
   await expect(gen.checkServerGeneration({rpc:async()=>({error:{code:'PGRST301',message:'timeout'}})},'u')).rejects.toThrow(/validar/);
 });
 it('retrocompatibilidade só se o RPC estiver efetivamente ausente',async()=>{
   const gen=await import('../../src/sync/server-generation');
   expect(await gen.checkServerGeneration({rpc:async()=>({error:{code:'PGRST202',message:'public.spider_sync_state not found'}})},'u')).toEqual({mode:'legacy'});
 });
});
