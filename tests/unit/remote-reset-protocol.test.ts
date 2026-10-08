import { beforeEach, describe, expect, it, vi } from 'vitest';
const values = new Map<string,string>();
const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
const sync={invalidate:vi.fn(),waitForInFlight:vi.fn(async()=>{})};
const disconnect=vi.fn(async()=>{});
const resetLocal=vi.fn(async()=>{});
vi.mock('../../src/reset/local-reset',()=>({resetThisDevice:(...args:any[])=>resetLocal(...args)}));
beforeEach(async()=>{vi.resetModules();values.clear();vi.stubGlobal('localStorage',storage);vi.stubGlobal('navigator',{onLine:true,locks:{request:async(_name:string,_options:any,callback:(lock:unknown)=>Promise<unknown>)=>callback({name:'test-lock'})}});vi.stubGlobal('window',{SPIDER_REMOTE_RESET_VERIFIED:false,setTimeout,clearTimeout});vi.stubGlobal('crypto',{randomUUID:()=> '00000000-0000-4000-8000-000000000001'});sync.invalidate.mockClear();sync.waitForInFlight.mockClear();resetLocal.mockClear();});
function mockServer(){
 let generation=1, data=[{user:'A',ord:1}], deleteCalls=0, requests:string[]=[];
 const rpc=vi.fn(async(name:string,args?:any)=>{
  if(name==='spider_sync_state')return{data:{protocol:4,generation,count:data.length},error:null};
  if(name==='spider_sync_reset'){
   requests.push(args.p_request_id);
   if(generation===1){generation=2;data=[];deleteCalls++;return {data:{protocol:4,generation},error:null};}
   return {data:{protocol:4,generation,replayed:true},error:null};
  }
  return {error:{message:'unknown'}};
 });
 return { client:{rpc,auth:{getUser:vi.fn(async()=>({data:{user:{id:'A'}},error:null}))}}, get:()=>({generation,data,deleteCalls,requests}) };
}
describe('reset remoto (desativado até homologação do banco)',()=>{
 it('rejeita sem confirmação e sem verificação administrativa',async()=>{
   const {appState}=await import('../../src/state/app-state');appState.currentUser={id:'A'};
   const {resetDeviceAndCloud}=await import('../../src/reset/remote-reset');const {client}=mockServer();
   await expect(resetDeviceAndCloud({client,sync,disconnect},'APAGAR')).rejects.toThrow(/indisponível/);
   expect(client.rpc).not.toHaveBeenCalled();expect(resetLocal).not.toHaveBeenCalled();
 });
 it('resposta incerta mantém intent e evita segunda exclusão por retry',async()=>{
   (window as any).SPIDER_REMOTE_RESET_VERIFIED=true;
   const {appState}=await import('../../src/state/app-state');appState.currentUser={id:'A'};
   const remote=await import('../../src/reset/remote-reset');const mocked=mockServer();
   const original=mocked.client.rpc;
   let first=true;
   mocked.client.rpc=vi.fn(async(name:string,args?:any)=>{
     const response=await original(name,args);
     if(name==='spider_sync_reset'&&first){first=false;throw Error('network timeout');}
     return response;
   });
   const deps={client:mocked.client,sync,disconnect};
   await expect(remote.resetDeviceAndCloud(deps,'APAGAR')).rejects.toThrow(/Não foi possível confirmar/);
   expect(resetLocal).not.toHaveBeenCalled();expect(remote.cloudResetIntent()?.phase).toBe('pending');
   await remote.resumeCloudReset(deps);
   expect(mocked.get().deleteCalls).toBe(1);
   expect(mocked.get().requests[0]).toBe(mocked.get().requests[1]);
   expect(remote.cloudResetIntent()).toBeNull();expect(resetLocal).toHaveBeenCalledTimes(1);
 });
 it('falha na limpeza depois da exclusão relata estado parcial e preserva comprovante',async()=>{
   (window as any).SPIDER_REMOTE_RESET_VERIFIED=true;
   const {appState}=await import('../../src/state/app-state');appState.currentUser={id:'A'};
   const remote=await import('../../src/reset/remote-reset');const mocked=mockServer();
   resetLocal.mockRejectedValueOnce(Error('quota exceeded'));
   await expect(remote.resetDeviceAndCloud({client:mocked.client,sync,disconnect},'APAGAR')).rejects.toThrow(/FOI CONFIRMADO/);
   expect(remote.cloudResetIntent()?.phase).toBe('confirmed');
   await remote.resumeCloudReset({client:mocked.client,sync,disconnect});
   expect(mocked.get().deleteCalls).toBe(1);expect(remote.cloudResetIntent()).toBeNull();
 });
});
