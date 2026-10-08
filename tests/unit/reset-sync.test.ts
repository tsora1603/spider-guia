import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = new Map<string, string>();
const storage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => { data.set(key, value); },
  removeItem: (key: string) => { data.delete(key); }
};

beforeEach(() => {
  vi.resetModules();
  data.clear();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { setTimeout, clearTimeout });
});

describe('sincronização não ressuscita dados após reset', () => {
  it('ignora pull e push mesmo com usuário e servidor remoto', async () => {
    const { appState } = await import('../../src/state/app-state');
    const { beginLocalReset } = await import('../../src/reset/reset-guard');
    const { createSyncEngine } = await import('../../src/sync/sync-engine');
    appState.currentUser = { id: 'user' };
    const from = vi.fn(() => ({
      select: vi.fn(async () => ({ data: [{ ord: 1, status: 'Sim', updated_at: new Date().toISOString() }], error: null })),
      upsert: vi.fn(async () => ({ error: null }))
    }));
    const sync = createSyncEngine({ client: { from }, onLocalChanged: vi.fn(), onStateChange: vi.fn(), onToast: vi.fn() });
    beginLocalReset();
    await sync.pull();
    await sync.syncLocalRecords([1]);
    await sync.flushSyncQueue();
    expect(from).not.toHaveBeenCalled();
    expect(appState.progress).toEqual({});
    expect(appState.syncQueue).toEqual([]);
  });

  it('invalida resposta de pull iniciado antes da trava, sem importar nem enfileirar', async () => {
    const { appState } = await import('../../src/state/app-state');
    const { beginLocalReset } = await import('../../src/reset/reset-guard');
    const { createSyncEngine } = await import('../../src/sync/sync-engine');
    appState.currentUser = { id: 'user' };
    let finishPull!: (response: unknown) => void;
    const select = vi.fn(() => new Promise(resolve => { finishPull = resolve; }));
    const from = vi.fn(() => ({ select, upsert: vi.fn() }));
    const sync = createSyncEngine({ client: { from }, onLocalChanged: vi.fn(), onStateChange: vi.fn(), onToast: vi.fn() });
    const pending = sync.pull();
    await Promise.resolve();
    beginLocalReset();
    sync.invalidate();
    finishPull({ data: [{ ord: 1, status: 'Sim', updated_at: new Date().toISOString() }], error: null });
    await pending;
    expect(appState.progress).toEqual({});
    expect(appState.syncQueue).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('aguarda escrita já enviada e ignora callback de sucesso antigo', async () => {
    const { appState } = await import('../../src/state/app-state');
    const { progressStore } = await import('../../src/state/progress-store');
    const { beginLocalReset } = await import('../../src/reset/reset-guard');
    const { createSyncEngine } = await import('../../src/sync/sync-engine');
    appState.currentUser = { id: 'user' };
    progressStore.set(1, 'Sim');
    let finishPush!: (response: unknown) => void;
    const upsert = vi.fn(() => new Promise(resolve => { finishPush = resolve; }));
    const sync = createSyncEngine({ client: { from: () => ({ upsert }) }, onLocalChanged: vi.fn(), onStateChange: vi.fn(), onToast: vi.fn() });
    const pending = sync.syncLocalRecords([1]);
    await Promise.resolve();
    beginLocalReset();
    sync.invalidate();
    const waiting = sync.waitForInFlight();
    finishPush({ error: null });
    await Promise.all([pending, waiting]);
    expect(appState.syncQueue).toEqual([]);
    expect(appState.syncState).toBe('blocked');
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
