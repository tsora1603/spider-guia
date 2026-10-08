import { beforeEach, describe, expect, it, vi } from 'vitest';

const entries = new Map<string, string>();
const storage = {
  getItem: (k: string) => entries.get(k) ?? null,
  setItem: (k: string, v: string) => { entries.set(k, v); },
  removeItem: (k: string) => { entries.delete(k); }
};
const rows = (count = 1) => Array.from({ length: count }, (_, index) => ({
  ord: index + 1, status: 'Sim', updated_at: '2026-01-01T00:00:00.000Z'
}));
function clientFor(rowsInput: any[], fail = false) {
  const select = vi.fn();
  const range = vi.fn(async (from: number, to: number) => fail
    ? { data: null, error: { message: 'rede indisponível' } }
    : { data: rowsInput.slice(from, to + 1), error: null });
  const order = vi.fn(() => ({ range }));
  const eq = vi.fn(() => ({ order }));
  select.mockReturnValue({ eq });
  const upsert = vi.fn();
  const from = vi.fn(() => ({ select, upsert }));
  return { client: { from }, select, eq, range, upsert };
}
async function setup() {
  const guard = await import('../../src/reset/reset-guard');
  const { appState } = await import('../../src/state/app-state');
  const { progressStore } = await import('../../src/state/progress-store');
  const reconnect = await import('../../src/reset/cloud-reconnect');
  guard.beginLocalReset();
  guard.completeLocalReset();
  appState.currentUser = { id: 'person-a' };
  return { guard, appState, progressStore, reconnect };
}
beforeEach(() => {
  vi.resetModules();
  entries.clear();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('crypto', { randomUUID: () => 'consent-grant-1' });
});

describe('reconexão protegida após reset', () => {
  it('não bloqueia usuários sem reset anterior', async () => {
    const guard = await import('../../src/reset/reset-guard');
    expect(guard.isSyncBlocked()).toBe(false);
    expect(guard.cloudDecision()).toBeNull();
  });
  it('consulta nuvem em modo somente leitura, com filtro por usuário', async () => {
    const { guard, reconnect } = await setup();
    const api = clientFor(rows(2));
    const remote = await reconnect.readCloudRecords(api.client, 'person-a');
    expect(remote).toHaveLength(2);
    expect(api.eq).toHaveBeenCalledWith('user_id', 'person-a');
    expect(api.upsert).not.toHaveBeenCalled();
    expect(guard.isSyncBlocked()).toBe(true);
  });
  it('não confunde ausência de registros com progresso remoto existente', async () => {
    const { reconnect, guard } = await setup();
    const empty = await reconnect.readCloudRecords(clientFor([]).client, 'person-a');
    expect(reconnect.previewCloud(empty).count).toBe(0);
    await expect(reconnect.restoreFromCloud({ client: clientFor([]).client, userId: 'person-a', invalidate: vi.fn(), waitForInFlight: async () => {}, afterRestored: vi.fn() }, reconnect.previewCloud(empty))).rejects.toThrow('Não há progresso');
    expect(guard.cloudDecision()).toBe('pending');
    expect(guard.isSyncBlocked()).toBe(true);
  });
  it('adiamento e continuar sem sincronizar persistem sem liberar pull/push', async () => {
    const { guard, reconnect } = await setup();
    const before = entries.get(guard.LOCAL_RESET_GUARD_KEY);
    expect(before).toContain('pending'); // fechar modal não modifica a decisão
    reconnect.stayOnDevice(() => {});
    expect(guard.cloudDecision()).toBe('local-only');
    expect(guard.isSyncBlocked()).toBe(true);
    vi.resetModules();
    const reloaded = await import('../../src/reset/reset-guard');
    expect(reloaded.cloudDecision()).toBe('local-only');
    expect(reloaded.isSyncBlocked()).toBe(true);
  });
  it('mescla por updatedAt com consentimento, preserva o registro local mais recente e elimina filas antigas', async () => {
    const { appState, progressStore, reconnect, guard } = await setup();
    const timestamp = Date.parse('2026-04-01T00:00:00.000Z');
    progressStore.set(1, 'Pulei', { updatedAt: timestamp });
    progressStore.save();
    appState.syncQueue = [{ userId: 'person-a', id: 1, status: 'Pulei', updatedAt: timestamp, attempts: 1, nextAt: 0 }];
    const api = clientFor([...rows(2)]);
    const preview = reconnect.previewCloud(await reconnect.readCloudRecords(api.client, 'person-a'));
    const afterRestored = vi.fn(async () => {});
    await reconnect.restoreFromCloud({ client: api.client, userId: 'person-a', invalidate: vi.fn(), waitForInFlight: async () => {}, afterRestored }, preview);
    expect(progressStore.record(1)?.status).toBe('Pulei');
    expect(progressStore.record(2)?.status).toBe('Sim');
    expect(appState.syncQueue).toEqual([]);
    expect(guard.mayUseCloud('person-a')).toBe(true);
    expect(guard.mayUseCloud('person-b')).toBe(false);
    expect(afterRestored).toHaveBeenCalledOnce();
    expect(api.upsert).not.toHaveBeenCalled();
  });
  it('mantém bloqueio após erro de rede e não modifica progresso', async () => {
    const { guard, reconnect, progressStore } = await setup();
    const api = clientFor(rows(), true);
    await expect(reconnect.readCloudRecords(api.client, 'person-a')).rejects.toThrow('rede indisponível');
    expect(progressStore.snapshot().progress).toEqual({});
    expect(guard.isSyncBlocked()).toBe(true);
  });
  it('exige nova revisão se o progresso remoto ou local mudar', async () => {
    const { guard, reconnect, progressStore } = await setup();
    const api = clientFor(rows(1));
    const preview = reconnect.previewCloud(await reconnect.readCloudRecords(api.client, 'person-a'));
    progressStore.set(1, 'Pulei');
    await expect(reconnect.restoreFromCloud({ client: api.client, userId: 'person-a', invalidate: vi.fn(), waitForInFlight: async () => {}, afterRestored: vi.fn() }, preview)).rejects.toThrow('mudou');
    expect(guard.isSyncBlocked()).toBe(true);
  });
  it('paginação obtém mais de 500 registros sem trunca-los', async () => {
    const { reconnect } = await setup();
    const api = clientFor(rows(1201));
    const remote = await reconnect.readCloudRecords(api.client, 'person-a');
    expect(remote).toHaveLength(1201);
    expect(api.range).toHaveBeenCalledTimes(3);
  });
  it('uma aba antiga não herda o consentimento emitido por outra aba', async () => {
    const { guard } = await setup();
    vi.resetModules();
    const staleTabGuard = await import('../../src/reset/reset-guard');
    guard.authorizeRestoredCloud('person-a');
    expect(guard.isSyncBlocked()).toBe(false);
    expect(staleTabGuard.isSyncBlocked()).toBe(true);
    expect(staleTabGuard.mayUseCloud('person-a')).toBe(false);
    expect(staleTabGuard.canPersistLocalChange()).toBe(false);
  });
  it('autorização vinculada à conta sobrevive a recarga, mas não a outra conta', async () => {
    const { guard } = await setup();
    guard.authorizeRestoredCloud('person-a');
    vi.resetModules();
    const reloaded = await import('../../src/reset/reset-guard');
    expect(reloaded.mayUseCloud('person-a')).toBe(true);
    expect(reloaded.mayUseCloud('person-b')).toBe(false);
    expect(reloaded.resetPhase()).toBe('completed');
  });
  it('interpreta marcador legado da Etapa 2 como decisão pendente, nunca como autorização', async () => {
    entries.set('aranha-local-reset-guard-v1', JSON.stringify({ version: 1, phase: 'completed' }));
    vi.resetModules();
    const guard = await import('../../src/reset/reset-guard');
    expect(guard.cloudDecision()).toBe('pending');
    expect(guard.isSyncBlocked()).toBe(true);
  });
  it('não desbloqueia diante de dados remotos inválidos', async () => {
    const { guard, reconnect } = await setup();
    const api = clientFor([{ord:1,status:'Desconhecido',updated_at:'2026-01-01T00:00:00.000Z'}]);
    await expect(reconnect.readCloudRecords(api.client, 'person-a')).rejects.toThrow('inválidos');
    expect(guard.isSyncBlocked()).toBe(true);
    expect(api.upsert).not.toHaveBeenCalled();
  });
  it('registro remoto mais recente substitui o local somente após confirmação', async () => {
    const { guard, reconnect, progressStore } = await setup();
    progressStore.set(1, 'Pulei', { updatedAt: Date.parse('2025-01-01') });
    progressStore.save();
    const api = clientFor(rows(1));
    const preview = reconnect.previewCloud(await reconnect.readCloudRecords(api.client, 'person-a'));
    expect(progressStore.record(1)?.status).toBe('Pulei');
    await reconnect.restoreFromCloud({client:api.client,userId:'person-a',invalidate:vi.fn(),waitForInFlight:async()=>{},afterRestored:async()=>{}}, preview);
    expect(progressStore.record(1)?.status).toBe('Sim');
    expect(guard.mayUseCloud('person-a')).toBe(true);
  });
  it('erro ao persistir mesclagem não emite autorização de sincronização', async () => {
    const { guard, reconnect } = await setup();
    const api = clientFor(rows(1));
    const preview = reconnect.previewCloud(await reconnect.readCloudRecords(api.client, 'person-a'));
    const originalSet = storage.setItem;
    storage.setItem = (key, value) => { if (key === 'aranha-progress-meta-v2') throw Error('Falha simulada'); originalSet(key, value); };
    try {
      await expect(reconnect.restoreFromCloud({client:api.client,userId:'person-a',invalidate:vi.fn(),waitForInFlight:async()=>{},afterRestored:async()=>{}}, preview)).rejects.toThrow('verificar');
      expect(guard.isSyncBlocked()).toBe(true);
      expect(guard.cloudDecision()).toBe('pending');
    } finally { storage.setItem = originalSet; }
  });

});
