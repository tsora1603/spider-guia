import { beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  values = new Map<string, string>();
  failedRemoval: string | null = null;
  failSet = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failSet) throw new Error('QuotaExceededError');
    this.values.set(key, value);
  }
  removeItem(key: string) {
    if (this.failedRemoval === key) throw new Error('SecurityError');
    this.values.delete(key);
  }
  clear() { throw new Error('clear não é permitido'); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

let storage: MemoryStorage;
const load = async () => {
  const [{ resetThisDevice, RESET_STORAGE_KEYS }, guard, { appState }, { progressStore }, { engagementPreferences }, { spoilerPreferences }, { designPreferences }, { readingPreferences }] = await Promise.all([
    import('../../src/reset/local-reset'),
    import('../../src/reset/reset-guard'),
    import('../../src/state/app-state'),
    import('../../src/state/progress-store'),
    import('../../src/engagement/preferences'),
    import('../../src/spoilers/preferences'),
    import('../../src/design/preferences'),
    import('../../src/preferences/reading-preferences')
  ]);
  return { resetThisDevice, RESET_STORAGE_KEYS, guard, appState, progressStore, engagementPreferences, spoilerPreferences, designPreferences, readingPreferences };
};

beforeEach(() => {
  vi.resetModules();
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('navigator', { onLine: true });
});

describe('reset local transacional e com escopo explícito', () => {
  it('remove chaves atuais e legadas sem tocar em outro aplicativo nem no backup exportado', async () => {
    const env = await load();
    for (const key of env.RESET_STORAGE_KEYS) storage.setItem(key, 'valor antigo');
    storage.setItem('outra-aplicacao', 'preservar');
    env.progressStore.set(1, 'Sim');
    env.appState.syncQueue = [{ userId: 'user', id: 1, status: 'Sim', updatedAt: 100, attempts: 2, nextAt: 100 }];
    env.engagementPreferences.setWeeklyGoal(12);
    env.spoilerPreferences.set('tudo');
    env.designPreferences.set({ theme: 'light', fontScale: 'large', focusMode: true });
    env.readingPreferences.set({ depth: 'complete', onboardingComplete: true, readThrough: 200 });
    const called: string[] = [];
    await env.resetThisDevice({
      sync: { invalidate: () => called.push('invalidate'), waitForInFlight: async () => { called.push('wait'); } },
      disconnect: async () => { called.push('disconnect'); }
    });
    expect(called).toEqual(['invalidate', 'wait', 'disconnect']);
    for (const key of env.RESET_STORAGE_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem('outra-aplicacao')).toBe('preservar');
    expect(env.appState.progress).toEqual({});
    expect(env.appState.progressMeta).toEqual({});
    expect(env.appState.readingLog).toEqual({});
    expect(env.appState.syncQueue).toEqual([]);
    expect(env.engagementPreferences.getWeeklyGoal()).toBe(5);
    expect(env.spoilerPreferences.get()).toBe('nenhum');
    expect(env.designPreferences.get()).toMatchObject({ theme: 'auto', fontScale: 'default', focusMode: false });
    expect(env.readingPreferences.get()).toMatchObject({ depth: 'essential', onboardingComplete: false, readThrough: 0 });
    expect(env.guard.isSyncBlocked()).toBe(true);
    expect(env.guard.resetPhase()).toBe('completed');
  });

  it('desconecta sessão existente antes de apagar o progresso', async () => {
    const env = await load();
    env.appState.currentUser = { id: 'exemplo', email: 'abc@example.org' };
    storage.setItem('aranha-progress-v1', '{"1":"Sim"}');
    await env.resetThisDevice({
      sync: { invalidate: () => {}, waitForInFlight: async () => {} },
      disconnect: async () => {
        expect(storage.getItem('aranha-progress-v1')).not.toBeNull();
        env.appState.currentUser = null;
      }
    });
    expect(env.appState.currentUser).toBeNull();
    expect(storage.getItem('aranha-progress-v1')).toBeNull();
  });

  it('interrompe sem remover progresso caso desconexão falhe ou esteja offline e não seja segura', async () => {
    const env = await load();
    storage.setItem('aranha-progress-v1', '{"1":"Sim"}');
    vi.stubGlobal('navigator', { onLine: false });
    await expect(env.resetThisDevice({
      sync: { invalidate: () => {}, waitForInFlight: async () => {} },
      disconnect: async () => { throw new Error('Sem desconexão verificada'); }
    })).rejects.toThrow('Sem desconexão verificada');
    expect(storage.getItem('aranha-progress-v1')).not.toBeNull();
    expect(env.guard.resetPhase()).toBe('preparing');
    expect(env.guard.isSyncBlocked()).toBe(true);
  });

  it('interrompe sem excluir dados se falhar a gravação da trava', async () => {
    const env = await load();
    storage.setItem('aranha-progress-v1', '{}');
    storage.failSet = true;
    const disconnect = vi.fn();
    await expect(env.resetThisDevice({ sync: { invalidate: vi.fn(), waitForInFlight: vi.fn() }, disconnect })).rejects.toThrow('proteção persistente');
    expect(disconnect).not.toHaveBeenCalled();
    expect(storage.getItem('aranha-progress-v1')).toBe('{}');
  });

  it('rejeita falha de remoção e mantém a trava para permitir tentativa posterior', async () => {
    const env = await load();
    storage.failedRemoval = 'aranha-progress-v1';
    storage.setItem('aranha-progress-v1', '{"1":"Sim"}');
    await expect(env.resetThisDevice({ sync: { invalidate: () => {}, waitForInFlight: async () => {} }, disconnect: async () => {} })).rejects.toThrow('Falha ao remover');
    expect(env.guard.isSyncBlocked()).toBe(true);
    expect(storage.getItem('aranha-progress-v1')).not.toBeNull();
  });

  it('não limpa dados quando um push anterior ainda está ativo', async () => {
    const env = await load();
    storage.setItem('aranha-progress-v1', '{"1":"Sim"}');
    await expect(env.resetThisDevice({
      sync: { invalidate: () => {}, waitForInFlight: async () => { throw new Error('Push pendente'); } },
      disconnect: vi.fn()
    })).rejects.toThrow('Push pendente');
    expect(storage.getItem('aranha-progress-v1')).toContain('Sim');
    expect(env.guard.isSyncBlocked()).toBe(true);
  });

  it('mantém o bloqueio após a recarga do módulo, impedindo pull/push automáticos', async () => {
    const env = await load();
    await env.resetThisDevice({ sync: { invalidate: () => {}, waitForInFlight: async () => {} }, disconnect: async () => {} });
    vi.resetModules();
    const guardReloaded = await import('../../src/reset/reset-guard');
    expect(guardReloaded.isSyncBlocked()).toBe(true);
    expect(guardReloaded.resetPhase()).toBe('completed');
  });
});
